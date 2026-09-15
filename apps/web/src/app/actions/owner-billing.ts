'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type Stripe from 'stripe';
import { hotelPlanSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireOwner } from '@/lib/auth-context';
import { getStripe, priceIdForHotelPlan, priceToHotelPlanMap } from '@/lib/stripe';
import { findLiveSubscription } from '@/lib/stripe-subscriptions';
import {
  hotelPlanFor,
  isLaunchOfferEligible,
  type HotelPlan,
  type HotelPlanDef,
} from '@/lib/hotel-plans';
import {
  hotelSubscriptionToState,
  periodEndFromSubscription,
  type BillingStatus,
  type HotelBillingState,
} from '@/lib/stripe-billing-events';
import { applyHotelBillingState } from '@/lib/business-billing-sync';
import { BILLING_OK } from '@/lib/business-visibility';

/**
 * Self-serve subscription management for a hotel / accommodation.
 *
 * The owner picks a package and pays through Stripe Checkout; the webhook
 * (and the post-checkout sync below) derive `hotels.plan`, `billing_status`
 * and `current_period_end` from the subscription. The "first 50 hotels"
 * launch offer is a slot claimed atomically in the DB and applied as a
 * first-year Stripe coupon.
 */

const HOTEL_COLUMNS =
  'id, name, plan, billing_status, stripe_customer_id, stripe_subscription_id, current_period_end, launch_offer_applied, launch_offer_rank';

type HotelRow = {
  id: string;
  name: string;
  plan: HotelPlan;
  billing_status: BillingStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  launch_offer_applied: boolean;
  launch_offer_rank: number | null;
};

const checkoutSchema = z.object({
  plan: hotelPlanSchema,
  locale: z.enum(['el', 'en']).default('el'),
});
const localeSchema = z.object({ locale: z.enum(['el', 'en']).default('el') });
const syncSchema = z.object({ sessionId: z.string().min(1).max(200).optional() });

function appUrl(locale: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return locale === 'en' ? `${base}/en` : base;
}

async function loadHotel(): Promise<
  { ok: true; email: string; role: string; hotel: HotelRow } | { ok: false; error: string }
> {
  const ctx = await requireOwner();
  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from('hotels')
    .select(HOTEL_COLUMNS)
    .eq('id', ctx.hotelId)
    .single();
  if (error || !data) return { ok: false, error: 'hotel_not_found' };
  return { ok: true, email: ctx.email, role: ctx.role, hotel: data as HotelRow };
}

async function ensureHotelCustomer(hotel: HotelRow, email: string): Promise<string> {
  if (hotel.stripe_customer_id) return hotel.stripe_customer_id;
  const customer = await getStripe().customers.create({
    email,
    name: hotel.name,
    metadata: { hotelId: hotel.id },
  });
  await createSupabaseServiceClient()
    .from('hotels')
    .update({ stripe_customer_id: customer.id })
    .eq('id', hotel.id);
  return customer.id;
}

/** Starts Stripe Checkout for the chosen package (applies the launch offer when a slot is free). */
export async function createHotelCheckout(raw: unknown) {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const { plan, locale } = parsed.data;
  const def = hotelPlanFor(plan);
  if (!def) return { ok: false as const, error: 'invalid' };

  const loaded = await loadHotel();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  if (loaded.role !== 'owner') return { ok: false as const, error: 'forbidden' };
  const { hotel, email } = loaded;
  if (BILLING_OK.has(hotel.billing_status)) return { ok: false as const, error: 'already_active' };

  const admin = createSupabaseServiceClient();
  try {
    const customerId = await ensureHotelCustomer(hotel, email);
    // Never create a second subscription: if Stripe already has a live one
    // (webhook lag, abandoned incomplete checkout…), sync instead.
    const live = await findLiveSubscription(customerId);
    if (live && live.status !== 'incomplete') {
      await applyHotelBillingState(
        admin,
        hotel.id,
        hotelSubscriptionToState(live as unknown as Record<string, unknown>, priceToHotelPlanMap()),
      );
      return { ok: false as const, error: 'already_active' };
    }

    let launchRank: number | null = null;
    if (isLaunchOfferEligible(plan) && def.launchCouponId) {
      const { data } = await admin.rpc('claim_launch_offer', { p_hotel_id: hotel.id });
      launchRank = typeof data === 'number' ? data : null;
    }

    const metadata = {
      kind: 'hotel_plan',
      hotelId: hotel.id,
      plan,
      launchOffer: launchRank ? '1' : '0',
    };
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: hotel.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceIdForHotelPlan(plan), quantity: 1 }],
      // `discounts` and `allow_promotion_codes` are mutually exclusive.
      ...(launchRank && def.launchCouponId ? { discounts: [{ coupon: def.launchCouponId }] } : {}),
      success_url: `${appUrl(locale)}/owner/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl(locale)}/owner/billing?status=canceled`,
      locale: locale === 'en' ? 'en' : 'el',
      metadata,
      subscription_data: { metadata },
    });
    if (!session.url) return { ok: false as const, error: 'stripe_no_url' };

    await admin.from('hotels').update({ billing_status: 'checkout_sent' }).eq('id', hotel.id);
    return { ok: true as const, url: session.url, launchRank };
  } catch (err) {
    console.error('createHotelCheckout failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

/** Stripe customer portal: card, package switch, cancellation, invoices. */
export async function createPortalSession(raw?: unknown) {
  const parsed = localeSchema.safeParse(raw ?? {});
  const locale = parsed.success ? parsed.data.locale : 'el';
  const loaded = await loadHotel();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  if (loaded.role !== 'owner') return { ok: false as const, error: 'forbidden' };
  try {
    const customerId = await ensureHotelCustomer(loaded.hotel, loaded.email);
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl(locale)}/owner/billing`,
      locale: locale === 'en' ? 'en' : 'el',
    });
    return { ok: true as const, url: session.url };
  } catch (err) {
    console.error(
      'createPortalSession stripe call failed',
      err instanceof Error ? err.message : err,
    );
    return { ok: false as const, error: 'stripe_error' };
  }
}

/**
 * Re-derives the hotel row from Stripe. Used right after checkout (the
 * webhook may not have landed yet) and as a manual "refresh". Same mapper as
 * the webhook, so the two can only ever write identical state.
 */
export async function syncMyHotelBillingFromStripe(raw: unknown) {
  const parsed = syncSchema.safeParse(raw ?? {});
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const loaded = await loadHotel();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const { hotel } = loaded;
  const stripe = getStripe();
  const admin = createSupabaseServiceClient();

  try {
    let sub: Stripe.Subscription | null = null;
    if (parsed.data.sessionId) {
      const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, {
        expand: ['subscription'],
      });
      const belongsToUs =
        session.client_reference_id === hotel.id || session.metadata?.hotelId === hotel.id;
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (!belongsToUs || (hotel.stripe_customer_id && customerId !== hotel.stripe_customer_id)) {
        return { ok: false as const, error: 'session_mismatch' };
      }
      sub =
        typeof session.subscription === 'object'
          ? (session.subscription as Stripe.Subscription)
          : null;
    } else if (hotel.stripe_subscription_id) {
      sub = await stripe.subscriptions.retrieve(hotel.stripe_subscription_id);
    } else if (hotel.stripe_customer_id) {
      sub = await findLiveSubscription(hotel.stripe_customer_id);
    }

    let state: HotelBillingState;
    if (sub) {
      state = hotelSubscriptionToState(
        sub as unknown as Record<string, unknown>,
        priceToHotelPlanMap(),
      );
    } else if (hotel.billing_status === 'unbilled' || hotel.billing_status === 'checkout_sent') {
      return { ok: true as const, state: null };
    } else {
      state = {
        billing_status: 'canceled',
        stripe_subscription_id: null,
        current_period_end: null,
        plan: null,
      };
    }
    await applyHotelBillingState(admin, hotel.id, state);
    revalidatePath('/[locale]/(owner)/owner', 'layout');
    return { ok: true as const, state };
  } catch (err) {
    console.error('syncMyHotelBillingFromStripe failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

export interface OwnerInvoice {
  id: string;
  number: string | null;
  createdAt: string;
  totalCents: number;
  currency: string;
  status: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

export interface OwnerBillingSummary {
  hotel: HotelRow;
  plan: HotelPlanDef | null;
  subscription: { status: string; cancelAtPeriodEnd: boolean; renewsAt: string | null } | null;
  launchOfferRemaining: number;
  invoices: OwnerInvoice[];
  stripeConfigured: boolean;
  /** Only the owner role may start or manage payments. */
  canManage: boolean;
}

/** Everything the /owner/billing page shows. Stripe failures degrade to DB-only data. */
export async function getOwnerBillingSummary(): Promise<
  { ok: true; summary: OwnerBillingSummary } | { ok: false; error: string }
> {
  const loaded = await loadHotel();
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { hotel } = loaded;
  const admin = createSupabaseServiceClient();

  const { data: remaining } = await admin.rpc('launch_offer_remaining');
  const summary: OwnerBillingSummary = {
    hotel,
    plan: hotelPlanFor(hotel.plan),
    subscription: null,
    launchOfferRemaining: typeof remaining === 'number' ? remaining : 0,
    invoices: [],
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    canManage: loaded.role === 'owner',
  };
  if (!summary.stripeConfigured || !hotel.stripe_customer_id) return { ok: true, summary };

  try {
    const stripe = getStripe();
    const [sub, invoices] = await Promise.all([
      hotel.stripe_subscription_id
        ? stripe.subscriptions.retrieve(hotel.stripe_subscription_id).catch(() => null)
        : Promise.resolve(null),
      stripe.invoices.list({ customer: hotel.stripe_customer_id, limit: 12 }).catch(() => null),
    ]);
    if (sub) {
      summary.subscription = {
        status: sub.status,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        renewsAt: periodEndFromSubscription(sub as unknown as Record<string, unknown>),
      };
    }
    summary.invoices = (invoices?.data ?? []).map((inv) => ({
      id: inv.id,
      number: inv.number ?? null,
      createdAt: new Date(inv.created * 1000).toISOString(),
      totalCents: inv.total,
      currency: inv.currency,
      status: inv.status ?? 'draft',
      hostedUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
    }));
  } catch (err) {
    console.error(
      'getOwnerBillingSummary stripe read failed',
      err instanceof Error ? err.message : err,
    );
  }
  return { ok: true, summary };
}

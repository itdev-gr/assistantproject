'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type Stripe from 'stripe';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requirePartner } from '@/lib/auth-context';
import { getStripe, priceIdForTier, priceToTierMap } from '@/lib/stripe';
import { findLiveSubscription } from '@/lib/stripe-subscriptions';
import { PAID_TIERS, PLANS, isPaidTier, type PaidTier } from '@/lib/plans';
import {
  periodEndFromSubscription,
  subscriptionToBillingState,
  type BillingStatus,
  type BusinessBillingState,
  type Tier,
} from '@/lib/stripe-billing-events';
import { applyBusinessBillingState, reindexBusinessPartners } from '@/lib/business-billing-sync';
import { billingOk } from '@/lib/business-visibility';

/**
 * Self-serve subscription management for a partner's business.
 *
 * Everything is scoped to the caller's first owned business (requirePartner
 * resolves ownership through `business_owners`). Billing columns are read via
 * the service role because client roles are not granted them (0017).
 */

const BILLING_COLUMNS =
  'id, name, billing_email, stripe_customer_id, stripe_subscription_id, billing_status, subscription_tier, billing_exempt, current_period_end, verified, active';

type BusinessBillingRow = {
  id: string;
  name: string;
  billing_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: BillingStatus;
  subscription_tier: Tier;
  billing_exempt: boolean;
  current_period_end: string | null;
  verified: boolean;
  active: boolean;
};

const checkoutSchema = z.object({
  tier: z.enum(PAID_TIERS as [PaidTier, ...PaidTier[]]),
  locale: z.enum(['el', 'en']).default('el'),
});
const localeSchema = z.object({ locale: z.enum(['el', 'en']).default('el') });
const syncSchema = z.object({
  sessionId: z.string().min(1).max(200).optional(),
});

function appUrl(locale: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return locale === 'en' ? `${base}/en` : base;
}

async function loadOwnedBusiness(): Promise<
  { ok: true; email: string; business: BusinessBillingRow } | { ok: false; error: string }
> {
  const ctx = await requirePartner();
  const businessId = ctx.businessIds[0];
  if (!businessId) return { ok: false, error: 'no_business' };
  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from('businesses')
    .select(BILLING_COLUMNS)
    .eq('id', businessId)
    .single();
  if (error || !data) return { ok: false, error: 'business_not_found' };
  return { ok: true, email: ctx.email, business: data as BusinessBillingRow };
}

async function ensureCustomer(business: BusinessBillingRow, email: string): Promise<string> {
  if (business.stripe_customer_id) return business.stripe_customer_id;
  const customer = await getStripe().customers.create({
    email: business.billing_email ?? email,
    name: business.name,
    metadata: { businessId: business.id },
  });
  await createSupabaseServiceClient()
    .from('businesses')
    .update({ stripe_customer_id: customer.id })
    .eq('id', business.id);
  return customer.id;
}

/** Starts Stripe Checkout for the chosen plan. */
export async function createPartnerCheckout(raw: unknown) {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const { tier, locale } = parsed.data;

  const loaded = await loadOwnedBusiness();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const { business, email } = loaded;
  if (business.billing_exempt) return { ok: false as const, error: 'exempt' };
  if (billingOk(business)) return { ok: false as const, error: 'already_active' };

  try {
    const customerId = await ensureCustomer(business, email);
    // Never create a second subscription: if Stripe already has a live one
    // (webhook lag, abandoned incomplete checkout…), sync instead.
    const live = await findLiveSubscription(customerId);
    if (live && live.status !== 'incomplete') {
      await applyBusinessBillingState(
        createSupabaseServiceClient(),
        business.id,
        subscriptionToBillingState(live as unknown as Record<string, unknown>, priceToTierMap()),
      );
      return { ok: false as const, error: 'already_active' };
    }

    const metadata = { kind: 'business_plan', businessId: business.id, tier };
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: business.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceIdForTier(tier), quantity: 1 }],
      success_url: `${appUrl(locale)}/partner/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl(locale)}/partner/billing?status=canceled`,
      locale: locale === 'en' ? 'en' : 'el',
      metadata,
      subscription_data: { metadata },
    });
    if (!session.url) return { ok: false as const, error: 'stripe_no_url' };

    await createSupabaseServiceClient()
      .from('businesses')
      .update({ billing_status: 'checkout_sent' })
      .eq('id', business.id);
    return { ok: true as const, url: session.url };
  } catch (err) {
    console.error('createPartnerCheckout failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

/** Stripe customer portal: card, plan switch, cancellation, invoices. */
export async function createPartnerPortalSession(raw: unknown) {
  const parsed = localeSchema.safeParse(raw ?? {});
  const locale = parsed.success ? parsed.data.locale : 'el';
  const loaded = await loadOwnedBusiness();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  try {
    const customerId = await ensureCustomer(loaded.business, loaded.email);
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl(locale)}/partner/billing`,
      locale: locale === 'en' ? 'en' : 'el',
    });
    return { ok: true as const, url: session.url };
  } catch (err) {
    console.error('createPartnerPortalSession failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

/**
 * Re-derives the business row from Stripe. Used right after checkout (the
 * webhook may not have landed yet) and as a manual "refresh". Same mapper as
 * the webhook, so the two can only ever write identical state.
 */
export async function syncMyBillingFromStripe(raw: unknown) {
  const parsed = syncSchema.safeParse(raw ?? {});
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const loaded = await loadOwnedBusiness();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const { business } = loaded;
  const stripe = getStripe();
  const admin = createSupabaseServiceClient();

  try {
    let sub: Stripe.Subscription | null = null;
    if (parsed.data.sessionId) {
      const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, {
        expand: ['subscription'],
      });
      const belongsToUs =
        session.client_reference_id === business.id || session.metadata?.businessId === business.id;
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (
        !belongsToUs ||
        (business.stripe_customer_id && customerId !== business.stripe_customer_id)
      ) {
        return { ok: false as const, error: 'session_mismatch' };
      }
      sub =
        typeof session.subscription === 'object'
          ? (session.subscription as Stripe.Subscription)
          : null;
    } else if (business.stripe_subscription_id) {
      sub = await stripe.subscriptions.retrieve(business.stripe_subscription_id);
    } else if (business.stripe_customer_id) {
      sub = await findLiveSubscription(business.stripe_customer_id);
    }

    let state: BusinessBillingState;
    if (sub) {
      state = subscriptionToBillingState(
        sub as unknown as Record<string, unknown>,
        priceToTierMap(),
      );
    } else if (
      business.billing_status === 'unbilled' ||
      business.billing_status === 'checkout_sent'
    ) {
      return { ok: true as const, state: null };
    } else {
      state = {
        billing_status: 'canceled',
        subscription_tier: 'free',
        stripe_subscription_id: null,
        current_period_end: null,
      };
    }
    await applyBusinessBillingState(admin, business.id, state);
    after(() => reindexBusinessPartners(admin, business.id));
    revalidatePath('/[locale]/(partner)/partner', 'layout');
    revalidatePath('/[locale]', 'page');
    return { ok: true as const, state };
  } catch (err) {
    console.error('syncMyBillingFromStripe failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

export interface PartnerInvoice {
  id: string;
  number: string | null;
  createdAt: string;
  totalCents: number;
  currency: string;
  status: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

export interface PartnerBillingSummary {
  business: {
    id: string;
    name: string;
    verified: boolean;
    active: boolean;
    billing_status: BillingStatus;
    subscription_tier: Tier;
    billing_exempt: boolean;
    current_period_end: string | null;
  };
  plan: (typeof PLANS)[number] | null;
  subscription: { status: string; cancelAtPeriodEnd: boolean; renewsAt: string | null } | null;
  requestedTier: PaidTier | null;
  invoices: PartnerInvoice[];
  stripeConfigured: boolean;
}

/** Everything the /partner/billing page shows. Stripe failures degrade to DB-only data. */
export async function getPartnerBillingSummary(): Promise<
  { ok: true; summary: PartnerBillingSummary } | { ok: false; error: string }
> {
  const loaded = await loadOwnedBusiness();
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { business } = loaded;
  const admin = createSupabaseServiceClient();

  const { data: app } = await admin
    .from('partner_applications')
    .select('requested_tier')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const requestedTier = isPaidTier(app?.requested_tier) ? app.requested_tier : null;

  const summary: PartnerBillingSummary = {
    business: {
      id: business.id,
      name: business.name,
      verified: business.verified,
      active: business.active,
      billing_status: business.billing_status,
      subscription_tier: business.subscription_tier,
      billing_exempt: business.billing_exempt,
      current_period_end: business.current_period_end,
    },
    plan: PLANS.find((p) => p.tier === business.subscription_tier) ?? null,
    subscription: null,
    requestedTier,
    invoices: [],
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
  };
  if (!summary.stripeConfigured || !business.stripe_customer_id) return { ok: true, summary };

  try {
    const stripe = getStripe();
    const [sub, invoices] = await Promise.all([
      business.stripe_subscription_id
        ? stripe.subscriptions.retrieve(business.stripe_subscription_id).catch(() => null)
        : Promise.resolve(null),
      stripe.invoices.list({ customer: business.stripe_customer_id, limit: 12 }).catch(() => null),
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
      'getPartnerBillingSummary stripe read failed',
      err instanceof Error ? err.message : err,
    );
  }
  return { ok: true, summary };
}

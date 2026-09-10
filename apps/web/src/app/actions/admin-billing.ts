'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { getStripe, priceIdForTier, priceToTierMap } from '@/lib/stripe';
import { runCommissionInvoicing } from '@/lib/commission-invoicing-runner';
import { subscriptionToBillingState } from '@/lib/stripe-billing-events';
import { applyBusinessBillingState, reindexBusinessPartners } from '@/lib/business-billing-sync';
import { billingOk } from '@/lib/business-visibility';

/**
 * Admin-side billing for a *business* (migration 0017 moved subscriptions
 * from partnerships to businesses). Partners normally pay self-serve from
 * /partner/billing; these actions cover phone onboarding, comps and support.
 */

const checkoutSchema = z.object({
  businessId: z.string().uuid(),
  tier: z.enum(['standard', 'featured', 'exclusive']),
});
const idSchema = z.object({ businessId: z.string().uuid() });
const exemptSchema = z.object({ businessId: z.string().uuid(), exempt: z.boolean() });

const BILLING_COLUMNS =
  'id, name, billing_email, stripe_customer_id, stripe_subscription_id, billing_status, billing_exempt';

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/** Creates a Stripe Checkout link for a business and copies nothing — the admin sends it. */
export async function createBusinessCheckoutLink(raw: unknown) {
  await requireSuperAdmin();
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const { businessId, tier } = parsed.data;

  const admin = createSupabaseServiceClient();
  const { data: business, error } = await admin
    .from('businesses')
    .select(BILLING_COLUMNS)
    .eq('id', businessId)
    .single();
  if (error || !business) return { ok: false as const, error: 'business_not_found' };
  if (billingOk(business) && !business.billing_exempt) return { ok: false as const, error: 'already_active' };
  if (!business.billing_email) return { ok: false as const, error: 'missing_billing_email' };

  try {
    const stripe = getStripe();
    let customerId = business.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.billing_email,
        name: business.name,
        metadata: { businessId: business.id },
      });
      customerId = customer.id;
      await admin.from('businesses').update({ stripe_customer_id: customerId }).eq('id', business.id);
    }

    const metadata = { kind: 'business_plan', businessId, tier };
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: businessId,
      payment_method_types: ['card'],
      line_items: [{ price: priceIdForTier(tier), quantity: 1 }],
      success_url: `${appUrl()}/partner/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/partner/billing?status=canceled`,
      metadata,
      subscription_data: { metadata },
    });
    if (!session.url) return { ok: false as const, error: 'stripe_no_url' };

    await admin.from('businesses').update({ billing_status: 'checkout_sent' }).eq('id', businessId);
    revalidatePath('/[locale]/(admin)/admin/businesses', 'layout');
    return { ok: true as const, url: session.url };
  } catch (err) {
    console.error('createBusinessCheckoutLink stripe call failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

/** Cancels at period end; the webhook demotes the row when Stripe ends it. */
export async function cancelBusinessSubscription(raw: unknown) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };

  const admin = createSupabaseServiceClient();
  const { data: b, error } = await admin
    .from('businesses')
    .select('stripe_subscription_id')
    .eq('id', parsed.data.businessId)
    .single();
  if (error || !b?.stripe_subscription_id) return { ok: false as const, error: 'no_subscription' };

  try {
    await getStripe().subscriptions.update(b.stripe_subscription_id, { cancel_at_period_end: true });
    return { ok: true as const };
  } catch (err) {
    console.error('cancelBusinessSubscription stripe call failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

/** Comp toggle: exempt businesses are listed without a subscription. */
export async function setBusinessBillingExempt(raw: unknown) {
  await requireSuperAdmin();
  const parsed = exemptSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from('businesses')
    .update({ billing_exempt: parsed.data.exempt })
    .eq('id', parsed.data.businessId);
  if (error) return { ok: false as const, error: error.message };
  await reindexBusinessPartners(admin, parsed.data.businessId);
  revalidatePath('/[locale]/(admin)/admin/businesses', 'layout');
  revalidatePath('/[locale]', 'page');
  return { ok: true as const };
}

/**
 * Pulls the subscription from Stripe and rewrites the business row from it —
 * the same mapper the webhook uses, so this is the manual "make DB = Stripe".
 */
export async function syncBusinessBillingFromStripe(raw: unknown) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();
  const { data: b, error } = await admin
    .from('businesses')
    .select(BILLING_COLUMNS)
    .eq('id', parsed.data.businessId)
    .single();
  if (error || !b) return { ok: false as const, error: 'business_not_found' };

  try {
    const stripe = getStripe();
    let sub: Record<string, unknown> | null = null;
    if (b.stripe_subscription_id) {
      sub = (await stripe.subscriptions.retrieve(b.stripe_subscription_id)) as unknown as Record<string, unknown>;
    } else if (b.stripe_customer_id) {
      const list = await stripe.subscriptions.list({ customer: b.stripe_customer_id, status: 'all', limit: 10 });
      const live = list.data.find((s) => s.status !== 'canceled' && s.status !== 'incomplete_expired');
      sub = (live ?? null) as unknown as Record<string, unknown> | null;
    }
    if (!sub) {
      if (b.billing_status !== 'unbilled' && b.billing_status !== 'canceled') {
        await applyBusinessBillingState(admin, b.id, {
          billing_status: 'canceled',
          subscription_tier: 'free',
          stripe_subscription_id: null,
          current_period_end: null,
        });
      }
      return { ok: true as const, state: null };
    }
    const state = subscriptionToBillingState(sub, priceToTierMap());
    await applyBusinessBillingState(admin, b.id, state);
    await reindexBusinessPartners(admin, b.id);
    revalidatePath('/[locale]/(admin)/admin', 'layout');
    return { ok: true as const, state };
  } catch (err) {
    console.error('syncBusinessBillingFromStripe failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

export async function invoiceAccruedCommissions() {
  await requireSuperAdmin();
  try {
    const { invoiced, failed } = await runCommissionInvoicing(createSupabaseServiceClient(), getStripe());
    return { ok: true as const, invoiced, failed };
  } catch (err) {
    console.error('invoiceAccruedCommissions failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { getStripe, priceIdForTier } from '@/lib/stripe';

const checkoutSchema = z.object({
  partnershipId: z.string().uuid(),
  tier: z.enum(['standard', 'featured', 'exclusive']),
});
const idSchema = z.object({ partnershipId: z.string().uuid() });

export async function createCheckoutLink(raw: unknown) {
  await requireSuperAdmin();
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const { partnershipId, tier } = parsed.data;

  const admin = createSupabaseServiceClient();
  const { data: p, error } = await admin
    .from('partnerships')
    .select('id, business:businesses ( id, name, billing_email, stripe_customer_id )')
    .eq('id', partnershipId)
    .single();
  if (error || !p?.business) return { ok: false as const, error: 'partnership_not_found' };
  const business = p.business as {
    id: string; name: string; billing_email: string | null; stripe_customer_id: string | null;
  };
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const metadata = { kind: 'partnership_tier', partnershipId, tier };
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceIdForTier(tier), quantity: 1 }],
      success_url: `${appUrl}/?billing=success`,
      cancel_url: `${appUrl}/?billing=canceled`,
      metadata,
      subscription_data: { metadata },
    });
    if (!session.url) return { ok: false as const, error: 'stripe_no_url' };

    await admin.from('partnerships').update({ billing_status: 'checkout_sent' }).eq('id', partnershipId);
    revalidatePath('/[locale]/(admin)/admin/partnerships', 'layout');
    return { ok: true as const, url: session.url };
  } catch (err) {
    console.error('createCheckoutLink stripe call failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

export async function cancelTierSubscription(raw: unknown) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };

  const admin = createSupabaseServiceClient();
  const { data: p, error } = await admin
    .from('partnerships')
    .select('stripe_subscription_id')
    .eq('id', parsed.data.partnershipId)
    .single();
  if (error || !p?.stripe_subscription_id) return { ok: false as const, error: 'no_subscription' };

  try {
    await getStripe().subscriptions.update(p.stripe_subscription_id, { cancel_at_period_end: true });
    // Tier/status change lands via the customer.subscription.deleted webhook at period end.
    return { ok: true as const };
  } catch (err) {
    console.error('cancelTierSubscription stripe call failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

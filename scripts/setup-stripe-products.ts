/**
 * One-time setup of Stripe products/prices for placement tiers and the hotel
 * plan. Prints the resulting price IDs as env-var lines (never prints keys).
 *
 * Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.ts
 * Optional amount overrides (euro cents):
 *   TIER_STANDARD_CENTS=2900 TIER_FEATURED_CENTS=5900 TIER_EXCLUSIVE_CENTS=9900 HOTEL_PLAN_CENTS=4900
 */
import Stripe from 'stripe';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

const cents = (key: string, fallback: number) =>
  process.env[key] ? Number(process.env[key]) : fallback;

async function main() {
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  // Amounts must match apps/web/src/lib/plans.ts (the pricing page); the
  // nightly billing audit reports `price_drift` when they diverge.
  const defs = [
    { env: 'STRIPE_PRICE_STANDARD', key: 'partner_standard', tier: 'standard', name: 'Partner plan — Standard', amount: cents('TIER_STANDARD_CENTS', 2900) },
    { env: 'STRIPE_PRICE_FEATURED', key: 'partner_featured', tier: 'featured', name: 'Partner plan — Featured', amount: cents('TIER_FEATURED_CENTS', 5900) },
    { env: 'STRIPE_PRICE_EXCLUSIVE', key: 'partner_exclusive', tier: 'exclusive', name: 'Partner plan — Exclusive', amount: cents('TIER_EXCLUSIVE_CENTS', 9900) },
    { env: 'STRIPE_PRICE_HOTEL', key: 'hotel_assistant', tier: 'hotel', name: 'Hotel Assistant Plan', amount: cents('HOTEL_PLAN_CENTS', 4900) },
  ];
  for (const d of defs) {
    // Idempotent: reuse an active price with the same lookup key and amount.
    const existing = await stripe.prices.list({ lookup_keys: [d.key], active: true, limit: 1 });
    const found = existing.data[0];
    if (found && found.unit_amount === d.amount && found.currency === 'eur') {
      console.log(`${d.env}=${found.id}`);
      continue;
    }
    const product = await stripe.products.create({ name: d.name, metadata: { tier: d.tier } });
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: d.amount,
      recurring: { interval: 'month' },
      lookup_key: d.key,
      transfer_lookup_key: true,
      metadata: { tier: d.tier },
    });
    console.log(`${d.env}=${price.id}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

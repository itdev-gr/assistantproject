/**
 * One-time setup of Stripe products/prices (yearly) for the business tiers and
 * the hotel/accommodation packages, plus the "first 50 hotels" launch-offer
 * coupons. Prints the resulting price IDs as env-var lines (never prints keys).
 *
 * Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.ts
 * Optional amount overrides (euro cents):
 *   TIER_STANDARD_CENTS=14900 TIER_FEATURED_CENTS=29900
 *   HOTEL_ACCOMMODATION_CENTS=14900 HOTEL_BASIC_CENTS=99000
 *   HOTEL_PROFESSIONAL_CENTS=149000 HOTEL_ADVANCED_CENTS=199000 HOTEL_ENTERPRISE_CENTS=299000
 *
 * Amounts must match apps/web/src/lib/plans.ts and hotel-plans.ts (the pricing
 * page); the nightly billing audit reports `price_drift` when they diverge.
 */
import Stripe from 'stripe';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

const cents = (key: string, fallback: number) =>
  process.env[key] ? Number(process.env[key]) : fallback;

const LAUNCH_OFFER_CENTS = cents('HOTEL_BASIC_CENTS', 99000);

interface PriceDef {
  env: string;
  key: string;
  tier: string;
  name: string;
  amount: number;
}

const PRICES: PriceDef[] = [
  {
    env: 'STRIPE_PRICE_STANDARD',
    key: 'partner_business_yearly',
    tier: 'standard',
    name: 'Partner plan — Business (yearly)',
    amount: cents('TIER_STANDARD_CENTS', 14900),
  },
  {
    env: 'STRIPE_PRICE_FEATURED',
    key: 'partner_premium_yearly',
    tier: 'featured',
    name: 'Partner plan — Premium Partner (yearly)',
    amount: cents('TIER_FEATURED_CENTS', 29900),
  },
  {
    env: 'STRIPE_PRICE_HOTEL_ACCOMMODATION',
    key: 'hotel_accommodation_yearly',
    tier: 'accommodation',
    name: 'Accommodation plan (yearly)',
    amount: cents('HOTEL_ACCOMMODATION_CENTS', 14900),
  },
  {
    env: 'STRIPE_PRICE_HOTEL_BASIC',
    key: 'hotel_basic_yearly',
    tier: 'basic',
    name: 'Basic Hotel (yearly)',
    amount: LAUNCH_OFFER_CENTS,
  },
  {
    env: 'STRIPE_PRICE_HOTEL_PROFESSIONAL',
    key: 'hotel_professional_yearly',
    tier: 'professional',
    name: 'Professional Hotel (yearly)',
    amount: cents('HOTEL_PROFESSIONAL_CENTS', 149000),
  },
  {
    env: 'STRIPE_PRICE_HOTEL_ADVANCED',
    key: 'hotel_advanced_yearly',
    tier: 'advanced',
    name: 'Advanced Hotel (yearly)',
    amount: cents('HOTEL_ADVANCED_CENTS', 199000),
  },
  {
    env: 'STRIPE_PRICE_HOTEL_ENTERPRISE',
    key: 'hotel_enterprise_yearly',
    tier: 'enterprise',
    name: 'Enterprise Hotel (yearly)',
    amount: cents('HOTEL_ENTERPRISE_CENTS', 299000),
  },
];

/** First-year discount down to the Basic price; `duration: 'once'` = first invoice only. */
const COUPONS = PRICES.filter((p) =>
  ['professional', 'advanced', 'enterprise'].includes(p.tier),
).map((p) => ({
  id: `launch50_${p.tier}`,
  name: `Launch offer — first 50 hotels (${p.tier})`,
  amountOff: p.amount - LAUNCH_OFFER_CENTS,
}));

async function ensurePrice(stripe: Stripe, d: PriceDef): Promise<string> {
  // Idempotent: reuse an active yearly price with the same lookup key and amount.
  const existing = await stripe.prices.list({ lookup_keys: [d.key], active: true, limit: 1 });
  const found = existing.data[0];
  if (
    found &&
    found.unit_amount === d.amount &&
    found.currency === 'eur' &&
    found.recurring?.interval === 'year'
  ) {
    return found.id;
  }
  const product = await stripe.products.create({ name: d.name, metadata: { tier: d.tier } });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: d.amount,
    recurring: { interval: 'year' },
    lookup_key: d.key,
    transfer_lookup_key: true,
    metadata: { tier: d.tier },
  });
  return price.id;
}

async function ensureCoupon(stripe: Stripe, c: (typeof COUPONS)[number]): Promise<void> {
  try {
    const existing = await stripe.coupons.retrieve(c.id);
    if (existing.amount_off === c.amountOff && existing.currency === 'eur' && existing.valid)
      return;
    // Coupons are immutable: retire the stale one so the id can be recreated.
    await stripe.coupons.del(c.id);
  } catch (err) {
    if ((err as { code?: string }).code !== 'resource_missing') throw err;
  }
  await stripe.coupons.create({
    id: c.id,
    name: c.name,
    amount_off: c.amountOff,
    currency: 'eur',
    duration: 'once',
    metadata: { offer: 'launch50' },
  });
}

async function main() {
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  for (const d of PRICES) {
    const id = await ensurePrice(stripe, d);
    console.log(`${d.env}=${id}`);
  }
  for (const c of COUPONS) {
    await ensureCoupon(stripe, c);
    console.error(`coupon ${c.id}: -${(c.amountOff / 100).toFixed(0)} € once`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

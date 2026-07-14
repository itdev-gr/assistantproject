import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Server-only Stripe client. Throws if STRIPE_SECRET_KEY is unset. */
export function getStripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Missing env var: STRIPE_SECRET_KEY');
    cached = new Stripe(key);
  }
  return cached;
}

const TIER_PRICE_ENV = {
  standard: 'STRIPE_PRICE_STANDARD',
  featured: 'STRIPE_PRICE_FEATURED',
  exclusive: 'STRIPE_PRICE_EXCLUSIVE',
} as const;

export type PaidTier = keyof typeof TIER_PRICE_ENV;

export function priceIdForTier(tier: PaidTier): string {
  const value = process.env[TIER_PRICE_ENV[tier]];
  if (!value) throw new Error(`Missing env var: ${TIER_PRICE_ENV[tier]}`);
  return value;
}

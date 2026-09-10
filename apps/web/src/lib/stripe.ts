import Stripe from 'stripe';
import type { PaidTier } from './plans';

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

export const TIER_PRICE_ENV = {
  standard: 'STRIPE_PRICE_STANDARD',
  featured: 'STRIPE_PRICE_FEATURED',
  exclusive: 'STRIPE_PRICE_EXCLUSIVE',
} as const satisfies Record<PaidTier, string>;

export type { PaidTier };

export function priceIdForTier(tier: PaidTier): string {
  const value = process.env[TIER_PRICE_ENV[tier]];
  if (!value) throw new Error(`Missing env var: ${TIER_PRICE_ENV[tier]}`);
  return value;
}

/** price id → tier for every configured tier price (unset envs are skipped). */
export function priceToTierMap(): Record<string, PaidTier> {
  const out: Record<string, PaidTier> = {};
  for (const [tier, env] of Object.entries(TIER_PRICE_ENV) as [PaidTier, string][]) {
    const value = process.env[env];
    if (value) out[value] = tier;
  }
  return out;
}

export function tierForPriceId(priceId: string): PaidTier | null {
  return priceToTierMap()[priceId] ?? null;
}

/** Stripe stores unix seconds; the DB stores timestamptz. */
export function unixToIso(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;
}

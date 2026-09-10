import { describe, expect, it } from 'vitest';
import { PLANS, formatEuro, isPaidTier, planFor } from './plans';

/**
 * The pricing page promises these amounts; scripts/setup-stripe-products.ts
 * creates the Stripe prices with the same defaults. If either side changes,
 * change both (the nightly reconciler also flags `price_drift` against the
 * live Stripe prices).
 */
const SETUP_SCRIPT_DEFAULTS = { standard: 2900, featured: 5900, exclusive: 9900 } as const;

describe('PLANS', () => {
  it('lists the three paid tiers in ascending price order', () => {
    expect(PLANS.map((p) => p.tier)).toEqual(['standard', 'featured', 'exclusive']);
    for (let i = 1; i < PLANS.length; i++) expect(PLANS[i]!.cents).toBeGreaterThan(PLANS[i - 1]!.cents);
  });

  it('matches the amounts the Stripe setup script creates', () => {
    for (const p of PLANS) expect(p.cents).toBe(SETUP_SCRIPT_DEFAULTS[p.tier]);
  });

  it('has bilingual copy for every feature', () => {
    for (const p of PLANS) {
      expect(p.features.length).toBeGreaterThan(2);
      for (const f of p.features) {
        expect(f.en.length).toBeGreaterThan(0);
        expect(f.el.length).toBeGreaterThan(0);
      }
    }
  });

  it('exposes helpers', () => {
    expect(planFor('featured')?.highlight).toBe(true);
    expect(planFor('free')).toBeNull();
    expect(isPaidTier('exclusive')).toBe(true);
    expect(isPaidTier('free')).toBe(false);
    expect(formatEuro(2900, 'en')).toMatch(/29/);
    expect(formatEuro(2950, 'el')).toMatch(/29[,.]50/);
  });
});

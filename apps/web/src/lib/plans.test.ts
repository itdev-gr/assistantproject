import { describe, expect, it } from 'vitest';
import { BILLING_INTERVAL, PAID_TIERS, PLANS, formatEuro, isPaidTier, planFor } from './plans';

/**
 * The pricing page promises these amounts; scripts/setup-stripe-products.ts
 * creates the Stripe prices with the same defaults. If either side changes,
 * change both (the nightly reconciler also flags `price_drift` against the
 * live Stripe prices).
 */
const SETUP_SCRIPT_DEFAULTS = { standard: 14900, featured: 29900 } as const;

describe('PLANS', () => {
  it('lists the two paid tiers in ascending price order', () => {
    expect(PLANS.map((p) => p.tier)).toEqual(['standard', 'featured']);
    expect(PAID_TIERS).toEqual(['standard', 'featured']);
    for (let i = 1; i < PLANS.length; i++)
      expect(PLANS[i]!.cents).toBeGreaterThan(PLANS[i - 1]!.cents);
  });

  it('is billed yearly at the 2026 list prices', () => {
    expect(BILLING_INTERVAL).toBe('year');
    for (const p of PLANS) expect(p.cents).toBe(SETUP_SCRIPT_DEFAULTS[p.tier]);
    expect(PLANS.map((p) => p.lookupKey)).toEqual([
      'partner_business_yearly',
      'partner_premium_yearly',
    ]);
  });

  it('uses the public package names', () => {
    expect(planFor('standard')?.name.en).toBe('Business');
    expect(planFor('featured')?.name.en).toBe('Premium Partner');
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

  it('exposes helpers and no longer sells exclusive', () => {
    expect(planFor('featured')?.highlight).toBe(true);
    expect(planFor('free')).toBeNull();
    expect(planFor('exclusive')).toBeNull();
    expect(isPaidTier('featured')).toBe(true);
    expect(isPaidTier('exclusive')).toBe(false);
    expect(isPaidTier('free')).toBe(false);
    expect(formatEuro(14900, 'en')).toMatch(/149/);
    expect(formatEuro(149000, 'el')).toMatch(/1\.490/);
    expect(formatEuro(2950, 'el')).toMatch(/29[,.]50/);
  });
});

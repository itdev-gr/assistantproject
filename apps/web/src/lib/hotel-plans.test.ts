import { describe, expect, it } from 'vitest';
import {
  HOTEL_FEATURES,
  HOTEL_PLANS,
  HOTEL_PLAN_ORDER,
  LAUNCH_OFFER_CENTS,
  LAUNCH_OFFER_LIMIT,
  hotelPlanFeatures,
  hotelPlanFor,
  isHotelPlan,
  isLaunchOfferEligible,
  launchDiscountCents,
} from './hotel-plans';

/** Must match scripts/setup-stripe-products.ts defaults. */
const SETUP_SCRIPT_DEFAULTS = {
  accommodation: 14900,
  basic: 99000,
  professional: 149000,
  advanced: 199000,
  enterprise: 299000,
} as const;

describe('HOTEL_PLANS', () => {
  it('lists the five packages in ascending price order', () => {
    expect(HOTEL_PLANS.map((p) => p.plan)).toEqual([...HOTEL_PLAN_ORDER]);
    for (let i = 1; i < HOTEL_PLANS.length; i++) {
      expect(HOTEL_PLANS[i]!.cents).toBeGreaterThan(HOTEL_PLANS[i - 1]!.cents);
    }
  });

  it('matches the amounts the Stripe setup script creates', () => {
    for (const p of HOTEL_PLANS) expect(p.cents).toBe(SETUP_SCRIPT_DEFAULTS[p.plan]);
    expect(HOTEL_PLANS.every((p) => p.lookupKey === `hotel_${p.plan}_yearly`)).toBe(true);
  });

  it('has bilingual copy for every feature', () => {
    for (const p of HOTEL_PLANS) {
      expect(p.features.length).toBeGreaterThan(2);
      for (const f of p.features) {
        expect(f.en.length).toBeGreaterThan(0);
        expect(f.el.length).toBeGreaterThan(0);
      }
    }
  });

  it('exposes helpers', () => {
    expect(hotelPlanFor('professional')?.highlight).toBe(true);
    expect(hotelPlanFor('standard')).toBeNull();
    expect(isHotelPlan('enterprise')).toBe(true);
    expect(isHotelPlan('exclusive')).toBe(false);
  });
});

describe('launch offer', () => {
  it('discounts eligible hotel packages down to the Basic price for year one', () => {
    expect(LAUNCH_OFFER_LIMIT).toBe(50);
    expect(LAUNCH_OFFER_CENTS).toBe(99000);
    expect(launchDiscountCents('accommodation')).toBe(0);
    expect(launchDiscountCents('basic')).toBe(0);
    expect(launchDiscountCents('professional')).toBe(50000);
    expect(launchDiscountCents('advanced')).toBe(100000);
    expect(launchDiscountCents('enterprise')).toBe(200000);
  });

  it('only eligible packages carry a coupon and consume a slot', () => {
    for (const p of HOTEL_PLANS) {
      const eligible = isLaunchOfferEligible(p.plan);
      expect(eligible).toBe(launchDiscountCents(p.plan) > 0);
      expect(p.launchCouponId !== null).toBe(eligible);
      if (p.launchCouponId) expect(p.launchCouponId).toBe(`launch50_${p.plan}`);
    }
  });
});

describe('hotelPlanFeatures', () => {
  it('is a monotonic ladder', () => {
    let previous = hotelPlanFeatures(HOTEL_PLAN_ORDER[0]!);
    for (const plan of HOTEL_PLAN_ORDER.slice(1)) {
      const current = hotelPlanFeatures(plan);
      for (const f of HOTEL_FEATURES) {
        if (previous[f]) expect(current[f]).toBe(true);
      }
      previous = current;
    }
  });

  it('places the gates where the price list promises them', () => {
    expect(hotelPlanFeatures('accommodation').llmChat).toBe(false);
    expect(hotelPlanFeatures('basic').llmChat).toBe(false);
    expect(hotelPlanFeatures('professional').llmChat).toBe(true);
    expect(hotelPlanFeatures('professional').partnerConnections).toBe(false);
    expect(hotelPlanFeatures('advanced').partnerConnections).toBe(true);
    expect(hotelPlanFeatures('advanced').analytics).toBe(true);
    expect(hotelPlanFeatures('advanced').multiProperty).toBe(false);
    expect(hotelPlanFeatures('enterprise').multiProperty).toBe(true);
    expect(hotelPlanFeatures('enterprise').prioritySupport).toBe(true);
  });
});

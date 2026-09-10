import { describe, expect, it } from 'vitest';
import { billingOk, isListed, listingBlockers } from './business-visibility';

const base = { active: true, verified: true, billing_exempt: false, billing_status: 'active' as const };

describe('isListed', () => {
  it('is live when active, verified and paying', () => {
    expect(isListed(base)).toBe(true);
    expect(isListed({ ...base, billing_status: 'past_due' })).toBe(true);
  });

  it('is hidden without payment unless exempt', () => {
    for (const status of ['unbilled', 'checkout_sent', 'canceled'] as const) {
      expect(isListed({ ...base, billing_status: status })).toBe(false);
      expect(isListed({ ...base, billing_status: status, billing_exempt: true })).toBe(true);
    }
  });

  it('is hidden when unverified or inactive even if paying', () => {
    expect(isListed({ ...base, verified: false })).toBe(false);
    expect(isListed({ ...base, active: false })).toBe(false);
  });
});

describe('listingBlockers', () => {
  it('names every open gate in checklist order', () => {
    expect(listingBlockers(base)).toEqual([]);
    expect(listingBlockers({ ...base, billing_status: 'unbilled', verified: false })).toEqual(['payment', 'review']);
    expect(listingBlockers({ ...base, active: false })).toEqual(['inactive']);
    expect(billingOk({ billing_exempt: true, billing_status: 'canceled' })).toBe(true);
  });
});

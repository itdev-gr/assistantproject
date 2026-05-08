import { describe, it, expect } from 'vitest';
import { rank, DEFAULT_RULES, type RankingCandidate } from './ranking.js';

const baseCandidate = (overrides: Partial<RankingCandidate>): RankingCandidate => ({
  businessId: crypto.randomUUID(),
  keywordMatch: 0.5,
  distanceKm: 0.5,
  openNow: true,
  categoryFit: true,
  preferenceMatch: 0,
  partnership: null,
  ...overrides,
});

describe('rank', () => {
  it('orders by score descending', () => {
    const a = baseCandidate({ keywordMatch: 0.9, distanceKm: 0.2 });
    const b = baseCandidate({ keywordMatch: 0.3, distanceKm: 3.0 });
    const out = rank([a, b]);
    expect(out[0]!.businessId).toBe(a.businessId);
  });

  it('relevant non-partner outranks irrelevant featured partner', () => {
    const relevantNonPartner = baseCandidate({
      keywordMatch: 0.95,
      distanceKm: 0.3,
      openNow: true,
      categoryFit: true,
    });
    const irrelevantFeatured = baseCandidate({
      keywordMatch: 0.05,
      distanceKm: 5.0,
      openNow: false,
      categoryFit: false,
      partnership: { subscriptionTier: 'featured', paidPriorityScore: 100, commissionPct: 15 },
    });
    const [first] = rank([irrelevantFeatured, relevantNonPartner]);
    expect(first!.businessId).toBe(relevantNonPartner.businessId);
  });

  it('between two equally relevant candidates, partner wins', () => {
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    const baseProps = { keywordMatch: 0.7, distanceKm: 0.5, openNow: true, categoryFit: true };
    const partner = baseCandidate({
      ...baseProps,
      businessId: id1,
      partnership: { subscriptionTier: 'featured', paidPriorityScore: 80, commissionPct: 10 },
    });
    const nonPartner = baseCandidate({ ...baseProps, businessId: id2 });
    const [first] = rank([nonPartner, partner]);
    expect(first!.businessId).toBe(id1);
    expect(first!.promoted).toBe(true);
  });

  it('marks free-tier partners as not promoted', () => {
    const c = baseCandidate({
      partnership: { subscriptionTier: 'free', paidPriorityScore: 0, commissionPct: 0 },
    });
    const [first] = rank([c]);
    expect(first!.promoted).toBe(false);
    expect(first!.partnerBias).toBe(1.0);
  });

  it('respects maxResults', () => {
    const cs = Array.from({ length: 20 }, () => baseCandidate({}));
    const out = rank(cs, { ...DEFAULT_RULES, maxResults: 3 });
    expect(out).toHaveLength(3);
  });

  it('tie-break on commission when scores equal', () => {
    const baseProps = { keywordMatch: 0.5, distanceKm: 0.5, openNow: true, categoryFit: true };
    const lowCommission = baseCandidate({
      ...baseProps,
      partnership: { subscriptionTier: 'standard', paidPriorityScore: 50, commissionPct: 5 },
    });
    const highCommission = baseCandidate({
      ...baseProps,
      partnership: { subscriptionTier: 'standard', paidPriorityScore: 50, commissionPct: 20 },
    });
    const [first] = rank([lowCommission, highCommission]);
    expect(first!.businessId).toBe(highCommission.businessId);
  });
});

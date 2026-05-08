import type { SubscriptionTier } from '@aga/api-contracts';

export interface RecommendationRules {
  semanticWeight: number;
  proximityWeight: number;
  timeMatchWeight: number;
  categoryWeight: number;
  preferenceWeight: number;
  partnerBiasWeight: number;
  distancePenaltyPerKm: number;
  tierMultipliers: Record<SubscriptionTier, number>;
  /** Distance scale for the proximity exp() decay */
  proximityScaleKm: number;
  maxResults: number;
}

export const DEFAULT_RULES: RecommendationRules = {
  semanticWeight: 1.0,
  proximityWeight: 1.5,
  timeMatchWeight: 1.0,
  categoryWeight: 0.8,
  preferenceWeight: 0.5,
  partnerBiasWeight: 0.5,
  distancePenaltyPerKm: 0.05,
  tierMultipliers: { free: 1.0, standard: 1.15, featured: 1.4, exclusive: 1.7 },
  proximityScaleKm: 2.0,
  maxResults: 5,
};

export interface RankingCandidate {
  businessId: string;
  /** ts_rank or simple keyword overlap, 0..1 */
  keywordMatch: number;
  /** km from hotel */
  distanceKm: number;
  openNow: boolean;
  categoryFit: boolean;
  /** Jaccard overlap between business tags and session preferences, 0..1 */
  preferenceMatch: number;
  /** Active partnership for this hotel, or null */
  partnership: {
    subscriptionTier: SubscriptionTier;
    paidPriorityScore: number;
    commissionPct: number;
  } | null;
}

export interface RankedCandidate extends RankingCandidate {
  score: number;
  base: number;
  partnerBias: number;
  promoted: boolean;
}

export function rank(
  candidates: RankingCandidate[],
  rules: RecommendationRules = DEFAULT_RULES,
): RankedCandidate[] {
  const scored = candidates.map((c) => scoreOne(c, rules));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // tie-break on commission (only if both have partnerships)
    const ac = a.partnership?.commissionPct ?? -1;
    const bc = b.partnership?.commissionPct ?? -1;
    return bc - ac;
  });
  return scored.slice(0, rules.maxResults);
}

export function scoreOne(c: RankingCandidate, rules: RecommendationRules): RankedCandidate {
  const proximity = Math.exp(-c.distanceKm / rules.proximityScaleKm);
  const timeMatch = c.openNow ? 1.0 : 0.3;
  const categoryFit = c.categoryFit ? 1.0 : 0.5;

  const base =
    rules.semanticWeight * clamp01(c.keywordMatch) +
    rules.proximityWeight * proximity +
    rules.timeMatchWeight * timeMatch +
    rules.categoryWeight * categoryFit +
    rules.preferenceWeight * clamp01(c.preferenceMatch) -
    rules.distancePenaltyPerKm * c.distanceKm;

  let partnerBias = 1.0;
  let promoted = false;
  if (c.partnership) {
    const tierMult = rules.tierMultipliers[c.partnership.subscriptionTier] ?? 1.0;
    const paid = c.partnership.paidPriorityScore / 100;
    partnerBias = tierMult * (1 + rules.partnerBiasWeight * paid);
    promoted = c.partnership.subscriptionTier !== 'free';
  }

  return {
    ...c,
    base,
    partnerBias,
    promoted,
    score: base * partnerBias,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

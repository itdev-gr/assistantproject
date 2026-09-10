/**
 * "Is this business live?" — the TypeScript twin of the stored generated
 * column `businesses.listed` (migration 0017):
 *
 *   active AND verified AND (billing_exempt OR billing_status IN (active, past_due))
 *
 * Queries should filter on `listed` directly; use this helper when you already
 * hold a row (dashboards, reconciliation) and need the same answer.
 */

export type BillingStatus = 'unbilled' | 'checkout_sent' | 'active' | 'past_due' | 'canceled';

export interface ListableBusiness {
  active: boolean;
  verified: boolean;
  billing_exempt: boolean;
  billing_status: BillingStatus;
}

/** Billing states that keep a listing live (past_due keeps it while Stripe retries). */
export const BILLING_OK: ReadonlySet<BillingStatus> = new Set(['active', 'past_due']);

export function billingOk(b: Pick<ListableBusiness, 'billing_exempt' | 'billing_status'>): boolean {
  return b.billing_exempt || BILLING_OK.has(b.billing_status);
}

export function isListed(b: ListableBusiness): boolean {
  return b.active && b.verified && billingOk(b);
}

/** Which of the three gates is still open, for the partner's setup checklist. */
export type ListingBlocker = 'payment' | 'review' | 'inactive';

export function listingBlockers(b: ListableBusiness): ListingBlocker[] {
  const out: ListingBlocker[] = [];
  if (!billingOk(b)) out.push('payment');
  if (!b.verified) out.push('review');
  if (!b.active) out.push('inactive');
  return out;
}

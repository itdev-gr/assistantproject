/**
 * Stripe ↔ database billing reconciliation (pure).
 *
 * Given a snapshot of Stripe (subscriptions, prices, recent events, invoices,
 * customers) and of our tables, produce the list of discrepancies. The runner
 * (billing-reconcile-runner.ts) loads the snapshot, applies the fixes marked
 * `fixable`, and persists a `billing_reconciliation_runs` row; the admin page
 * renders the latest run. No I/O in here so every rule is unit-tested.
 */
import {
  hotelSubscriptionToState,
  subscriptionToBillingState,
  type BillingStatus,
  type PriceToHotelPlan,
  type PriceToTier,
  type Tier,
} from './stripe-billing-events';
import { BILLING_OK } from './business-visibility';
import type { HotelPlan } from './hotel-plans';

export type IssueKind =
  | 'status_mismatch'
  | 'tier_mismatch'
  | 'orphan_subscription'
  | 'missing_subscription'
  | 'unpaid_listed_business'
  | 'legacy_partnership_subscription'
  | 'webhook_unprocessed'
  | 'webhook_errored'
  | 'webhook_missed'
  | 'commission_state_stale'
  | 'commission_invoice_lost'
  | 'price_drift'
  | 'customer_email_drift'
  | 'legacy_price'
  | 'plan_mismatch'
  | 'launch_offer_stale';

export type FixAction =
  | { action: 'sync_business'; businessId: string }
  | { action: 'sync_hotel'; hotelId: string }
  | { action: 'replay_event'; eventId: string }
  | { action: 'ingest_event'; eventId: string }
  | { action: 'mark_commission_paid'; commissionEventId: string }
  | { action: 'release_launch_offer'; hotelId: string };

export interface ReconcileIssue {
  kind: IssueKind;
  severity: 'error' | 'warn';
  entity: {
    type:
      | 'business'
      | 'hotel'
      | 'partnership'
      | 'commission_event'
      | 'webhook_event'
      | 'subscription'
      | 'price'
      | 'customer';
    id: string;
    name?: string;
  };
  message: string;
  expected?: unknown;
  actual?: unknown;
  fix?: FixAction;
}

export interface StripeSubscriptionSnapshot {
  id: string;
  status: string;
  customer: string | null;
  priceId: string | null;
  metadata: Record<string, string>;
  /** unix seconds */
  currentPeriodEnd: number | null;
}

export interface ReconcileInput {
  /** ISO timestamp the snapshot was taken. */
  now: string;
  priceToTier: PriceToTier;
  priceToHotelPlan: PriceToHotelPlan;
  /** What the pricing page promises, per configured price id (label e.g. "business:standard", "hotel:basic"). */
  plans: Array<{ label: string; cents: number; priceId: string | null }>;
  stripe: {
    subscriptions: StripeSubscriptionSnapshot[];
    prices: Array<{
      id: string;
      unitAmount: number | null;
      currency: string;
      active: boolean;
      interval: string | null;
    }>;
    /** Ids of relevant Stripe events created in the lookback window (and older than the grace period). */
    recentEventIds: string[];
    /** Status of every Stripe invoice referenced by an `invoiced` commission event. */
    invoices: Array<{ id: string; status: string | null }>;
    customers: Array<{ id: string; email: string | null }>;
  };
  db: {
    businesses: Array<{
      id: string;
      name: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      billing_status: BillingStatus;
      subscription_tier: Tier;
      billing_exempt: boolean;
      verified: boolean;
      active: boolean;
      listed: boolean;
      billing_email: string | null;
    }>;
    hotels: Array<{
      id: string;
      name: string;
      stripe_subscription_id: string | null;
      billing_status: BillingStatus;
      plan: HotelPlan;
      launch_offer_applied: boolean;
      launch_offer_claimed_at: string | null;
    }>;
    partnerships: Array<{
      id: string;
      stripe_subscription_id: string | null;
      billing_status: BillingStatus;
    }>;
    commissionEvents: Array<{
      id: string;
      state: 'accrued' | 'invoiced' | 'paid';
      stripe_invoice_id: string | null;
    }>;
    webhookEvents: Array<{
      id: string;
      type: string;
      received_at: string;
      processed_at: string | null;
      error: string | null;
      attempts: number;
    }>;
  };
}

export interface ReconcileSummary {
  subscriptionsInStripe: number;
  liveSubscriptionsInStripe: number;
  businessesPaying: number;
  businessesExempt: number;
  businessesListed: number;
  hotelsPaying: number;
  launchOfferClaimed: number;
  webhookEventsPending: number;
  issuesByKind: Partial<Record<IssueKind, number>>;
}

export interface ReconcileResult {
  ok: boolean;
  issues: ReconcileIssue[];
  summary: ReconcileSummary;
}

/** Events older than this with `processed_at = null` count as stuck. */
export const WEBHOOK_GRACE_MS = 10 * 60 * 1000;
/** A launch-offer slot claimed at checkout but never paid is released after this. */
export const LAUNCH_OFFER_HOLD_MS = 3 * 24 * 60 * 60 * 1000;

const ENDED = new Set(['canceled', 'incomplete_expired']);

function toSubLike(s: StripeSubscriptionSnapshot): Record<string, unknown> {
  return {
    id: s.id,
    status: s.status,
    metadata: s.metadata,
    items: {
      data: [
        {
          price: s.priceId ? { id: s.priceId } : undefined,
          current_period_end: s.currentPeriodEnd ?? undefined,
        },
      ],
    },
  };
}

export function reconcileBilling(input: ReconcileInput): ReconcileResult {
  const issues: ReconcileIssue[] = [];
  const subsById = new Map(input.stripe.subscriptions.map((s) => [s.id, s]));
  const nowMs = Date.parse(input.now);

  const businessBySub = new Map<string, ReconcileInput['db']['businesses'][number]>();
  for (const b of input.db.businesses)
    if (b.stripe_subscription_id) businessBySub.set(b.stripe_subscription_id, b);
  const hotelBySub = new Map<string, ReconcileInput['db']['hotels'][number]>();
  for (const h of input.db.hotels)
    if (h.stripe_subscription_id) hotelBySub.set(h.stripe_subscription_id, h);
  const partnershipBySub = new Map<string, ReconcileInput['db']['partnerships'][number]>();
  for (const p of input.db.partnerships)
    if (p.stripe_subscription_id) partnershipBySub.set(p.stripe_subscription_id, p);
  const businessById = new Map(input.db.businesses.map((b) => [b.id, b]));

  // ---- businesses -------------------------------------------------------
  for (const b of input.db.businesses) {
    const entity = { type: 'business' as const, id: b.id, name: b.name };
    const fix: FixAction = { action: 'sync_business', businessId: b.id };

    if (b.stripe_subscription_id) {
      const sub = subsById.get(b.stripe_subscription_id);
      if (!sub) {
        issues.push({
          kind: 'missing_subscription',
          severity: 'error',
          entity,
          message: `DB references subscription ${b.stripe_subscription_id} which Stripe does not return`,
          actual: b.billing_status,
          fix,
        });
      } else {
        const expected = subscriptionToBillingState(toSubLike(sub), input.priceToTier);
        if (expected.billing_status !== b.billing_status) {
          issues.push({
            kind: 'status_mismatch',
            severity: 'error',
            entity,
            message: `Stripe subscription is ${sub.status} → ${expected.billing_status}, DB says ${b.billing_status}`,
            expected: expected.billing_status,
            actual: b.billing_status,
            fix,
          });
        }
        if (
          expected.billing_status !== 'canceled' &&
          expected.subscription_tier !== 'free' &&
          expected.subscription_tier !== b.subscription_tier
        ) {
          issues.push({
            kind: 'tier_mismatch',
            severity: 'error',
            entity,
            message: `Stripe price maps to ${expected.subscription_tier}, DB tier is ${b.subscription_tier}`,
            expected: expected.subscription_tier,
            actual: b.subscription_tier,
            fix,
          });
        }
      }
    } else if (BILLING_OK.has(b.billing_status) && !b.billing_exempt) {
      issues.push({
        kind: 'missing_subscription',
        severity: 'error',
        entity,
        message: `Business is ${b.billing_status} but has no Stripe subscription id`,
        actual: b.billing_status,
        fix,
      });
    }

    // The generated column should make this impossible; it guards the gate itself.
    if (b.listed && !b.billing_exempt && !BILLING_OK.has(b.billing_status)) {
      issues.push({
        kind: 'unpaid_listed_business',
        severity: 'error',
        entity,
        message: `Business is listed while billing_status is ${b.billing_status} and it is not exempt`,
        actual: b.billing_status,
      });
    }

    if (b.stripe_customer_id && b.billing_email) {
      const customer = input.stripe.customers.find((c) => c.id === b.stripe_customer_id);
      if (
        customer &&
        customer.email &&
        customer.email.toLowerCase() !== b.billing_email.toLowerCase()
      ) {
        issues.push({
          kind: 'customer_email_drift',
          severity: 'warn',
          entity,
          message: `Stripe customer email ${customer.email} differs from billing_email ${b.billing_email}`,
          expected: b.billing_email,
          actual: customer.email,
        });
      }
    }
  }

  // ---- hotels -----------------------------------------------------------
  for (const h of input.db.hotels) {
    const entity = { type: 'hotel' as const, id: h.id, name: h.name };
    const fix: FixAction = { action: 'sync_hotel', hotelId: h.id };
    if (h.stripe_subscription_id) {
      const sub = subsById.get(h.stripe_subscription_id);
      if (!sub) {
        issues.push({
          kind: 'missing_subscription',
          severity: 'error',
          entity,
          message: `Hotel references subscription ${h.stripe_subscription_id} unknown to Stripe`,
          actual: h.billing_status,
          fix,
        });
      } else {
        const expected = hotelSubscriptionToState(toSubLike(sub), input.priceToHotelPlan);
        if (expected.billing_status !== h.billing_status) {
          issues.push({
            kind: 'status_mismatch',
            severity: 'error',
            entity,
            message: `Stripe subscription is ${sub.status} → ${expected.billing_status}, DB says ${h.billing_status}`,
            expected: expected.billing_status,
            actual: h.billing_status,
            fix,
          });
        }
        if (expected.billing_status !== 'canceled' && expected.plan && expected.plan !== h.plan) {
          issues.push({
            kind: 'plan_mismatch',
            severity: 'error',
            entity,
            message: `Stripe price maps to the ${expected.plan} package, DB says ${h.plan}`,
            expected: expected.plan,
            actual: h.plan,
            fix,
          });
        }
      }
    } else if (BILLING_OK.has(h.billing_status)) {
      issues.push({
        kind: 'missing_subscription',
        severity: 'error',
        entity,
        message: `Hotel is ${h.billing_status} but has no Stripe subscription id`,
        actual: h.billing_status,
        fix,
      });
    }

    if (
      h.launch_offer_applied &&
      !BILLING_OK.has(h.billing_status) &&
      h.launch_offer_claimed_at &&
      nowMs - Date.parse(h.launch_offer_claimed_at) > LAUNCH_OFFER_HOLD_MS
    ) {
      issues.push({
        kind: 'launch_offer_stale',
        severity: 'warn',
        entity,
        message: `Launch-offer slot claimed on ${h.launch_offer_claimed_at.slice(0, 10)} was never paid; releasing it`,
        actual: h.billing_status,
        fix: { action: 'release_launch_offer', hotelId: h.id },
      });
    }
  }

  // ---- partnerships (should hold no subscriptions after 0017) ------------
  for (const p of input.db.partnerships) {
    if (p.stripe_subscription_id) {
      issues.push({
        kind: 'legacy_partnership_subscription',
        severity: 'warn',
        entity: { type: 'partnership', id: p.id },
        message: `Partnership still carries subscription ${p.stripe_subscription_id}; subscriptions belong to businesses now`,
        actual: p.stripe_subscription_id,
      });
    }
  }

  // ---- Stripe → DB: orphans ---------------------------------------------
  let live = 0;
  for (const sub of input.stripe.subscriptions) {
    if (ENDED.has(sub.status)) continue;
    live += 1;
    const known =
      businessBySub.has(sub.id) || hotelBySub.has(sub.id) || partnershipBySub.has(sub.id);
    if (known) {
      // A live subscription on a price we no longer sell (e.g. the retired
      // monthly plans) keeps working but must be moved by hand.
      if (sub.priceId && !input.priceToTier[sub.priceId] && !input.priceToHotelPlan[sub.priceId]) {
        const owner = businessBySub.get(sub.id) ?? hotelBySub.get(sub.id);
        issues.push({
          kind: 'legacy_price',
          severity: 'warn',
          entity: { type: 'subscription', id: sub.id, name: owner?.name },
          message: `Live subscription for ${owner?.name ?? sub.id} is on price ${sub.priceId}, which is not in the current price list — switch it to a yearly package`,
          actual: sub.priceId,
        });
      }
      continue;
    }
    const businessId = sub.metadata.businessId;
    const business = businessId ? businessById.get(businessId) : undefined;
    issues.push({
      kind: 'orphan_subscription',
      severity: 'error',
      entity: { type: 'subscription', id: sub.id, name: business?.name },
      message: business
        ? `Live Stripe subscription (${sub.status}) for business ${business.name} is not recorded in the DB`
        : `Live Stripe subscription (${sub.status}, kind=${sub.metadata.kind ?? '?'}) matches no business, hotel or partnership`,
      actual: sub.status,
      fix: business ? { action: 'sync_business', businessId: business.id } : undefined,
    });
  }

  // ---- webhook delivery ---------------------------------------------------
  const receivedIds = new Set(input.db.webhookEvents.map((e) => e.id));
  let pending = 0;
  for (const e of input.db.webhookEvents) {
    if (e.processed_at) continue;
    const ageMs = nowMs - Date.parse(e.received_at);
    if (ageMs < WEBHOOK_GRACE_MS) continue;
    pending += 1;
    issues.push({
      kind: e.error ? 'webhook_errored' : 'webhook_unprocessed',
      severity: 'error',
      entity: { type: 'webhook_event', id: e.id, name: e.type },
      message: e.error
        ? `Event ${e.type} failed ${e.attempts}× — last error: ${e.error}`
        : `Event ${e.type} received ${Math.round(ageMs / 60000)} min ago was never processed`,
      actual: e.error ?? null,
      fix: { action: 'replay_event', eventId: e.id },
    });
  }
  for (const id of input.stripe.recentEventIds) {
    if (receivedIds.has(id)) continue;
    issues.push({
      kind: 'webhook_missed',
      severity: 'error',
      entity: { type: 'webhook_event', id },
      message: `Stripe sent event ${id} but our webhook never stored it (endpoint down, wrong secret or not subscribed to this event type)`,
      fix: { action: 'ingest_event', eventId: id },
    });
  }

  // ---- commissions --------------------------------------------------------
  const invoiceStatus = new Map(input.stripe.invoices.map((i) => [i.id, i.status]));
  for (const c of input.db.commissionEvents) {
    if (c.state !== 'invoiced' || !c.stripe_invoice_id) continue;
    if (!invoiceStatus.has(c.stripe_invoice_id)) {
      issues.push({
        kind: 'commission_invoice_lost',
        severity: 'warn',
        entity: { type: 'commission_event', id: c.id },
        message: `Commission event is invoiced but Stripe invoice ${c.stripe_invoice_id} was not found`,
        actual: c.stripe_invoice_id,
      });
      continue;
    }
    const status = invoiceStatus.get(c.stripe_invoice_id);
    if (status === 'paid') {
      issues.push({
        kind: 'commission_state_stale',
        severity: 'error',
        entity: { type: 'commission_event', id: c.id },
        message: `Stripe invoice ${c.stripe_invoice_id} is paid but the commission event is still 'invoiced'`,
        expected: 'paid',
        actual: c.state,
        fix: { action: 'mark_commission_paid', commissionEventId: c.id },
      });
    } else if (status === 'void' || status === 'uncollectible') {
      issues.push({
        kind: 'commission_state_stale',
        severity: 'warn',
        entity: { type: 'commission_event', id: c.id },
        message: `Stripe invoice ${c.stripe_invoice_id} is ${status}; the commission needs a manual decision`,
        actual: status,
      });
    }
  }

  // ---- pricing page vs Stripe prices --------------------------------------
  for (const plan of input.plans) {
    const entity = { type: 'price' as const, id: plan.priceId ?? plan.label, name: plan.label };
    if (!plan.priceId) {
      issues.push({
        kind: 'price_drift',
        severity: 'error',
        entity,
        message: `No Stripe price configured for the ${plan.label} plan (STRIPE_PRICE_* env missing)`,
      });
      continue;
    }
    const price = input.stripe.prices.find((p) => p.id === plan.priceId);
    if (!price) {
      issues.push({
        kind: 'price_drift',
        severity: 'error',
        entity,
        message: `Configured price ${plan.priceId} for ${plan.label} does not exist in Stripe`,
      });
    } else if (!price.active) {
      issues.push({
        kind: 'price_drift',
        severity: 'error',
        entity,
        message: `Stripe price for ${plan.label} is archived`,
      });
    } else if (price.unitAmount !== plan.cents || price.currency.toLowerCase() !== 'eur') {
      issues.push({
        kind: 'price_drift',
        severity: 'error',
        entity,
        message: `Pricing page shows ${plan.cents} cents EUR for ${plan.label}, Stripe charges ${price.unitAmount} ${price.currency.toUpperCase()}`,
        expected: plan.cents,
        actual: price.unitAmount,
      });
    } else if (price.interval && price.interval !== 'year') {
      issues.push({
        kind: 'price_drift',
        severity: 'error',
        entity,
        message: `Pricing page promises yearly billing for ${plan.label}, Stripe price renews every ${price.interval}`,
        expected: 'year',
        actual: price.interval,
      });
    }
  }

  const issuesByKind: Partial<Record<IssueKind, number>> = {};
  for (const i of issues) issuesByKind[i.kind] = (issuesByKind[i.kind] ?? 0) + 1;

  const summary: ReconcileSummary = {
    subscriptionsInStripe: input.stripe.subscriptions.length,
    liveSubscriptionsInStripe: live,
    businessesPaying: input.db.businesses.filter(
      (b) => BILLING_OK.has(b.billing_status) && !b.billing_exempt,
    ).length,
    businessesExempt: input.db.businesses.filter((b) => b.billing_exempt).length,
    businessesListed: input.db.businesses.filter((b) => b.listed).length,
    hotelsPaying: input.db.hotels.filter((h) => BILLING_OK.has(h.billing_status)).length,
    launchOfferClaimed: input.db.hotels.filter((h) => h.launch_offer_applied).length,
    webhookEventsPending: pending,
    issuesByKind,
  };

  return { ok: issues.every((i) => i.severity !== 'error'), issues, summary };
}

import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@aga/db/types';
import { PLANS } from './plans';
import { HOTEL_PLANS } from './hotel-plans';
import { priceToHotelPlanMap, priceToTierMap } from './stripe';
import {
  reconcileBilling,
  type FixAction,
  type ReconcileInput,
  type ReconcileIssue,
  type ReconcileResult,
  type StripeSubscriptionSnapshot,
} from './billing-reconcile';
import {
  hotelSubscriptionToState,
  periodEndFromSubscription,
  subscriptionToBillingState,
  type StripeEventLike,
} from './stripe-billing-events';
import {
  applyBusinessBillingState,
  applyHotelBillingState,
  processStoredEvent,
  reindexBusinessPartners,
} from './business-billing-sync';

type DB = SupabaseClient<Database>;

/** Stripe event types the webhook acts on — used to detect missed deliveries. */
export const RELEVANT_EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
] as const;

const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const GRACE_MS = 10 * 60 * 1000;

function snapshotSubscription(s: Stripe.Subscription): StripeSubscriptionSnapshot {
  const first = s.items?.data?.[0];
  const price = first?.price;
  return {
    id: s.id,
    status: s.status,
    customer: typeof s.customer === 'string' ? s.customer : (s.customer?.id ?? null),
    priceId: typeof price === 'string' ? price : (price?.id ?? null),
    metadata: (s.metadata ?? {}) as Record<string, string>,
    currentPeriodEnd: (() => {
      const iso = periodEndFromSubscription(s as unknown as Record<string, unknown>);
      return iso ? Math.floor(Date.parse(iso) / 1000) : null;
    })(),
  };
}

/** Loads everything the pure reconciler needs. Stripe lists auto-paginate. */
export async function loadReconcileInput(
  admin: DB,
  stripe: Stripe,
  now = new Date(),
): Promise<ReconcileInput> {
  const priceToTier = priceToTierMap();
  const priceToHotelPlan = priceToHotelPlanMap();

  const subscriptions: StripeSubscriptionSnapshot[] = [];
  for await (const s of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    subscriptions.push(snapshotSubscription(s));
  }

  const plans: ReconcileInput['plans'] = [
    ...PLANS.map((p) => ({
      label: `business:${p.tier}`,
      cents: p.cents,
      priceId: process.env[p.priceEnv] ?? null,
    })),
    ...HOTEL_PLANS.map((p) => ({
      label: `hotel:${p.plan}`,
      cents: p.cents,
      priceId: process.env[p.priceEnv] ?? null,
    })),
  ];
  const prices: ReconcileInput['stripe']['prices'] = [];
  for (const plan of plans) {
    if (!plan.priceId) continue;
    try {
      const price = await stripe.prices.retrieve(plan.priceId);
      prices.push({
        id: price.id,
        unitAmount: price.unit_amount,
        currency: price.currency,
        active: price.active,
        interval: price.recurring?.interval ?? null,
      });
    } catch {
      /* missing price → reported as price_drift by the pure function */
    }
  }

  const since = Math.floor((now.getTime() - LOOKBACK_MS) / 1000);
  const until = Math.floor((now.getTime() - GRACE_MS) / 1000);
  const recentEventIds: string[] = [];
  for await (const e of stripe.events.list({
    types: [...RELEVANT_EVENT_TYPES],
    created: { gte: since, lte: until },
    limit: 100,
  })) {
    recentEventIds.push(e.id);
  }

  const [businesses, hotels, partnerships, commissionEvents, webhookEvents] = await Promise.all([
    admin
      .from('businesses')
      .select(
        'id, name, stripe_customer_id, stripe_subscription_id, billing_status, subscription_tier, billing_exempt, verified, active, listed, billing_email',
      ),
    admin
      .from('hotels')
      .select(
        'id, name, stripe_subscription_id, billing_status, plan, launch_offer_applied, launch_offer_claimed_at',
      ),
    admin.from('partnerships').select('id, stripe_subscription_id, billing_status'),
    admin.from('commission_events').select('id, state, stripe_invoice_id').eq('state', 'invoiced'),
    admin
      .from('stripe_webhook_events')
      .select('id, type, received_at, processed_at, error, attempts')
      .gte('received_at', new Date(now.getTime() - 7 * LOOKBACK_MS).toISOString()),
  ]);
  for (const r of [businesses, hotels, partnerships, commissionEvents, webhookEvents]) {
    if (r.error) throw new Error(`reconcile: DB read failed: ${r.error.message}`);
  }

  const invoiceIds = [
    ...new Set(
      (commissionEvents.data ?? []).map((c) => c.stripe_invoice_id).filter((x): x is string => !!x),
    ),
  ];
  const invoices: ReconcileInput['stripe']['invoices'] = [];
  for (const id of invoiceIds) {
    try {
      const inv = await stripe.invoices.retrieve(id);
      invoices.push({ id: inv.id, status: inv.status ?? null });
    } catch {
      /* not found → commission_invoice_lost */
    }
  }

  const customerIds = [
    ...new Set(
      (businesses.data ?? []).map((b) => b.stripe_customer_id).filter((x): x is string => !!x),
    ),
  ];
  const customers: ReconcileInput['stripe']['customers'] = [];
  for (const id of customerIds) {
    try {
      const c = await stripe.customers.retrieve(id);
      if (!('deleted' in c && c.deleted))
        customers.push({ id: c.id, email: (c as Stripe.Customer).email ?? null });
    } catch {
      /* ignore */
    }
  }

  return {
    now: now.toISOString(),
    priceToTier,
    priceToHotelPlan,
    plans,
    stripe: { subscriptions, prices, recentEventIds, invoices, customers },
    db: {
      businesses: (businesses.data ?? []) as ReconcileInput['db']['businesses'],
      hotels: (hotels.data ?? []) as ReconcileInput['db']['hotels'],
      partnerships: (partnerships.data ?? []) as ReconcileInput['db']['partnerships'],
      commissionEvents: (commissionEvents.data ?? []) as ReconcileInput['db']['commissionEvents'],
      webhookEvents: (webhookEvents.data ?? []) as ReconcileInput['db']['webhookEvents'],
    },
  };
}

/** Applies one fix. All fixes re-derive state from Stripe; none invent it. */
export async function applyFix(admin: DB, stripe: Stripe, fix: FixAction): Promise<void> {
  const priceToTier = priceToTierMap();
  switch (fix.action) {
    case 'sync_business': {
      const { data: b } = await admin
        .from('businesses')
        .select('id, stripe_customer_id, stripe_subscription_id, billing_status')
        .eq('id', fix.businessId)
        .single();
      if (!b) return;
      let sub: Stripe.Subscription | null = null;
      if (b.stripe_subscription_id) {
        sub = await stripe.subscriptions.retrieve(b.stripe_subscription_id).catch(() => null);
      }
      if (!sub && b.stripe_customer_id) {
        const list = await stripe.subscriptions.list({
          customer: b.stripe_customer_id,
          status: 'all',
          limit: 10,
        });
        sub =
          list.data.find((s) => s.status !== 'canceled' && s.status !== 'incomplete_expired') ??
          null;
      }
      const state = sub
        ? subscriptionToBillingState(sub as unknown as Record<string, unknown>, priceToTier)
        : {
            billing_status: 'canceled' as const,
            subscription_tier: 'free' as const,
            stripe_subscription_id: null,
            current_period_end: null,
          };
      await applyBusinessBillingState(admin, b.id, state);
      await reindexBusinessPartners(admin, b.id);
      return;
    }
    case 'sync_hotel': {
      const { data: h } = await admin
        .from('hotels')
        .select('id, stripe_subscription_id')
        .eq('id', fix.hotelId)
        .single();
      if (!h) return;
      const sub = h.stripe_subscription_id
        ? await stripe.subscriptions.retrieve(h.stripe_subscription_id).catch(() => null)
        : null;
      await applyHotelBillingState(
        admin,
        h.id,
        sub
          ? hotelSubscriptionToState(
              sub as unknown as Record<string, unknown>,
              priceToHotelPlanMap(),
            )
          : {
              billing_status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
              plan: null,
            },
      );
      return;
    }
    case 'release_launch_offer': {
      await admin.rpc('release_launch_offer', { p_hotel_id: fix.hotelId });
      return;
    }
    case 'replay_event': {
      const { data: row } = await admin
        .from('stripe_webhook_events')
        .select('id, type, payload')
        .eq('id', fix.eventId)
        .single();
      if (!row) return;
      await processStoredEvent(admin, {
        id: row.id,
        type: row.type,
        data: (row.payload as { data: { object: Record<string, unknown> } }).data,
      });
      return;
    }
    case 'ingest_event': {
      const event = await stripe.events.retrieve(fix.eventId);
      const { error } = await admin
        .from('stripe_webhook_events')
        .insert({ id: event.id, type: event.type, payload: event as unknown as Json });
      if (error && (error as { code?: string }).code !== '23505') throw new Error(error.message);
      await processStoredEvent(admin, event as unknown as StripeEventLike);
      return;
    }
    case 'mark_commission_paid': {
      await admin
        .from('commission_events')
        .update({ state: 'paid' })
        .eq('id', fix.commissionEventId);
      return;
    }
  }
}

export interface ReconcileRunOutcome {
  runId: string;
  ranAt: string;
  ok: boolean;
  /** Issues found on the first pass. */
  found: ReconcileIssue[];
  /** Issues that still exist after healing. */
  remaining: ReconcileIssue[];
  healed: number;
  summary: ReconcileResult['summary'];
}

/**
 * Snapshot → reconcile → heal fixable issues → reconcile again → persist.
 * The persisted row records the *remaining* issues (what a human must look
 * at) plus how many were healed automatically.
 */
export async function runBillingReconciliation(
  admin: DB,
  stripe: Stripe,
  opts: { heal?: boolean } = {},
): Promise<ReconcileRunOutcome> {
  const heal = opts.heal ?? true;
  const first = reconcileBilling(await loadReconcileInput(admin, stripe));

  let healed = 0;
  let final = first;
  if (heal && first.issues.some((i) => i.fix)) {
    const seen = new Set<string>();
    for (const issue of first.issues) {
      if (!issue.fix) continue;
      const key = JSON.stringify(issue.fix);
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        await applyFix(admin, stripe, issue.fix);
        healed += 1;
      } catch (err) {
        console.error('reconcile fix failed', issue.fix, err instanceof Error ? err.message : err);
      }
    }
    final = reconcileBilling(await loadReconcileInput(admin, stripe));
  }

  const ranAt = new Date().toISOString();
  const { data: run, error } = await admin
    .from('billing_reconciliation_runs')
    .insert({
      ran_at: ranAt,
      ok: final.ok,
      issue_count: final.issues.length,
      healed_count: healed,
      issues: final.issues as unknown as Json,
      summary: { ...final.summary, foundBeforeHealing: first.issues.length } as unknown as Json,
    })
    .select('id')
    .single();
  if (error) throw new Error(`reconcile: persisting run failed: ${error.message}`);

  return {
    runId: run.id,
    ranAt,
    ok: final.ok,
    found: first.issues,
    remaining: final.issues,
    healed,
    summary: final.summary,
  };
}

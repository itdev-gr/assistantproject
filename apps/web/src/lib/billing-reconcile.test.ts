import { describe, expect, it } from 'vitest';
import { reconcileBilling, WEBHOOK_GRACE_MS, type ReconcileInput } from './billing-reconcile';

const NOW = '2026-09-10T03:00:00.000Z';
const PRICES = { price_std: 'standard', price_feat: 'featured' } as const;
const HOTEL_PRICES = { price_hotel_basic: 'basic', price_hotel_pro: 'professional' } as const;

function business(
  over: Partial<ReconcileInput['db']['businesses'][number]> = {},
): ReconcileInput['db']['businesses'][number] {
  return {
    id: 'b-1',
    name: 'Taverna',
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_1',
    billing_status: 'active',
    subscription_tier: 'featured',
    billing_exempt: false,
    verified: true,
    active: true,
    listed: true,
    billing_email: 'owner@example.com',
    ...over,
  };
}

function sub(
  over: Partial<ReconcileInput['stripe']['subscriptions'][number]> = {},
): ReconcileInput['stripe']['subscriptions'][number] {
  return {
    id: 'sub_1',
    status: 'active',
    customer: 'cus_1',
    priceId: 'price_feat',
    metadata: { kind: 'business_plan', businessId: 'b-1', tier: 'featured' },
    currentPeriodEnd: 1_800_000_000,
    ...over,
  };
}

function hotel(
  over: Partial<ReconcileInput['db']['hotels'][number]> = {},
): ReconcileInput['db']['hotels'][number] {
  return {
    id: 'h-1',
    name: 'Hotel',
    stripe_subscription_id: 'sub_h',
    billing_status: 'active',
    plan: 'basic',
    launch_offer_applied: false,
    launch_offer_claimed_at: null,
    ...over,
  };
}

function input(
  over: {
    businesses?: ReconcileInput['db']['businesses'];
    hotels?: ReconcileInput['db']['hotels'];
    partnerships?: ReconcileInput['db']['partnerships'];
    commissionEvents?: ReconcileInput['db']['commissionEvents'];
    webhookEvents?: ReconcileInput['db']['webhookEvents'];
    subscriptions?: ReconcileInput['stripe']['subscriptions'];
    prices?: ReconcileInput['stripe']['prices'];
    recentEventIds?: string[];
    invoices?: ReconcileInput['stripe']['invoices'];
    customers?: ReconcileInput['stripe']['customers'];
    plans?: ReconcileInput['plans'];
  } = {},
): ReconcileInput {
  return {
    now: NOW,
    priceToTier: PRICES,
    priceToHotelPlan: HOTEL_PRICES,
    plans: over.plans ?? [
      { label: 'business:standard', cents: 14900, priceId: 'price_std' },
      { label: 'business:featured', cents: 29900, priceId: 'price_feat' },
      { label: 'hotel:basic', cents: 99000, priceId: 'price_hotel_basic' },
      { label: 'hotel:professional', cents: 149000, priceId: 'price_hotel_pro' },
    ],
    stripe: {
      subscriptions: over.subscriptions ?? [sub()],
      prices: over.prices ?? [
        { id: 'price_std', unitAmount: 14900, currency: 'eur', active: true, interval: 'year' },
        { id: 'price_feat', unitAmount: 29900, currency: 'eur', active: true, interval: 'year' },
        {
          id: 'price_hotel_basic',
          unitAmount: 99000,
          currency: 'eur',
          active: true,
          interval: 'year',
        },
        {
          id: 'price_hotel_pro',
          unitAmount: 149000,
          currency: 'eur',
          active: true,
          interval: 'year',
        },
      ],
      recentEventIds: over.recentEventIds ?? [],
      invoices: over.invoices ?? [],
      customers: over.customers ?? [{ id: 'cus_1', email: 'owner@example.com' }],
    },
    db: {
      businesses: over.businesses ?? [business()],
      hotels: over.hotels ?? [],
      partnerships: over.partnerships ?? [],
      commissionEvents: over.commissionEvents ?? [],
      webhookEvents: over.webhookEvents ?? [],
    },
  };
}

const kinds = (r: ReturnType<typeof reconcileBilling>) => r.issues.map((i) => i.kind);

describe('reconcileBilling', () => {
  it('reports a clean run when Stripe and the DB agree', () => {
    const r = reconcileBilling(input());
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.summary).toMatchObject({
      businessesPaying: 1,
      businessesListed: 1,
      liveSubscriptionsInStripe: 1,
    });
  });

  it('flags a status mismatch and offers a business sync', () => {
    const r = reconcileBilling(input({ subscriptions: [sub({ status: 'past_due' })] }));
    expect(kinds(r)).toEqual(['status_mismatch']);
    expect(r.issues[0]).toMatchObject({
      expected: 'past_due',
      actual: 'active',
      fix: { action: 'sync_business', businessId: 'b-1' },
    });
    expect(r.ok).toBe(false);
  });

  it('flags a tier mismatch when the Stripe price differs from the DB tier', () => {
    const r = reconcileBilling(input({ subscriptions: [sub({ priceId: 'price_std' })] }));
    expect(kinds(r)).toEqual(['tier_mismatch']);
    expect(r.issues[0]).toMatchObject({ expected: 'standard', actual: 'featured' });
  });

  it('flags a DB subscription id Stripe does not know', () => {
    const r = reconcileBilling(input({ subscriptions: [] }));
    expect(kinds(r)).toEqual(['missing_subscription']);
  });

  it('flags an active business without any subscription id (unless exempt)', () => {
    const r = reconcileBilling(
      input({ subscriptions: [], businesses: [business({ stripe_subscription_id: null })] }),
    );
    expect(kinds(r)).toEqual(['missing_subscription']);
    const exempt = reconcileBilling(
      input({
        subscriptions: [],
        businesses: [business({ stripe_subscription_id: null, billing_exempt: true })],
      }),
    );
    expect(exempt.issues).toEqual([]);
  });

  it('flags a live Stripe subscription nobody in the DB references', () => {
    const r = reconcileBilling(
      input({
        subscriptions: [
          sub(),
          sub({ id: 'sub_orphan', metadata: { kind: 'business_plan', businessId: 'b-1' } }),
        ],
      }),
    );
    expect(kinds(r)).toEqual(['orphan_subscription']);
    expect(r.issues[0]?.fix).toEqual({ action: 'sync_business', businessId: 'b-1' });
  });

  it('ignores ended Stripe subscriptions when looking for orphans', () => {
    const r = reconcileBilling(
      input({ subscriptions: [sub(), sub({ id: 'sub_old', status: 'canceled' })] }),
    );
    expect(r.issues).toEqual([]);
  });

  it('guards the listing gate itself', () => {
    const r = reconcileBilling(
      input({
        subscriptions: [sub({ status: 'unpaid' })],
        businesses: [
          business({ billing_status: 'canceled', stripe_subscription_id: null, listed: true }),
        ],
      }),
    );
    expect(kinds(r)).toContain('unpaid_listed_business');
  });

  it('flags stuck and errored webhook events past the grace period, but not fresh ones', () => {
    const old = new Date(Date.parse(NOW) - WEBHOOK_GRACE_MS - 1000).toISOString();
    const fresh = new Date(Date.parse(NOW) - 1000).toISOString();
    const r = reconcileBilling(
      input({
        webhookEvents: [
          {
            id: 'evt_stuck',
            type: 'invoice.paid',
            received_at: old,
            processed_at: null,
            error: null,
            attempts: 0,
          },
          {
            id: 'evt_err',
            type: 'customer.subscription.updated',
            received_at: old,
            processed_at: null,
            error: 'boom',
            attempts: 2,
          },
          {
            id: 'evt_fresh',
            type: 'invoice.paid',
            received_at: fresh,
            processed_at: null,
            error: null,
            attempts: 0,
          },
          {
            id: 'evt_done',
            type: 'invoice.paid',
            received_at: old,
            processed_at: NOW,
            error: null,
            attempts: 0,
          },
        ],
      }),
    );
    expect(kinds(r)).toEqual(['webhook_unprocessed', 'webhook_errored']);
    expect(r.issues.map((i) => i.fix)).toEqual([
      { action: 'replay_event', eventId: 'evt_stuck' },
      { action: 'replay_event', eventId: 'evt_err' },
    ]);
    expect(r.summary.webhookEventsPending).toBe(2);
  });

  it('flags Stripe events our webhook never received', () => {
    const r = reconcileBilling(
      input({
        recentEventIds: ['evt_a', 'evt_b'],
        webhookEvents: [
          {
            id: 'evt_a',
            type: 'invoice.paid',
            received_at: NOW,
            processed_at: NOW,
            error: null,
            attempts: 0,
          },
        ],
      }),
    );
    expect(kinds(r)).toEqual(['webhook_missed']);
    expect(r.issues[0]?.fix).toEqual({ action: 'ingest_event', eventId: 'evt_b' });
  });

  it('flags commission events whose Stripe invoice moved on', () => {
    const r = reconcileBilling(
      input({
        commissionEvents: [
          { id: 'c-paid', state: 'invoiced', stripe_invoice_id: 'in_paid' },
          { id: 'c-void', state: 'invoiced', stripe_invoice_id: 'in_void' },
          { id: 'c-lost', state: 'invoiced', stripe_invoice_id: 'in_gone' },
          { id: 'c-open', state: 'invoiced', stripe_invoice_id: 'in_open' },
          { id: 'c-done', state: 'paid', stripe_invoice_id: 'in_paid' },
        ],
        invoices: [
          { id: 'in_paid', status: 'paid' },
          { id: 'in_void', status: 'void' },
          { id: 'in_open', status: 'open' },
        ],
      }),
    );
    expect(kinds(r)).toEqual([
      'commission_state_stale',
      'commission_state_stale',
      'commission_invoice_lost',
    ]);
    expect(r.issues[0]).toMatchObject({
      severity: 'error',
      fix: { action: 'mark_commission_paid', commissionEventId: 'c-paid' },
    });
    expect(r.issues[1]).toMatchObject({ severity: 'warn', entity: { id: 'c-void' } });
  });

  it('flags pricing-page amounts that differ from Stripe, missing and archived prices', () => {
    const r = reconcileBilling(
      input({
        plans: [
          { label: 'business:standard', cents: 14900, priceId: 'price_std' },
          { label: 'business:featured', cents: 29900, priceId: 'price_feat' },
          { label: 'hotel:basic', cents: 99000, priceId: null },
          { label: 'hotel:professional', cents: 149000, priceId: 'price_hotel_pro' },
        ],
        prices: [
          { id: 'price_std', unitAmount: 15900, currency: 'eur', active: true, interval: 'year' },
          { id: 'price_feat', unitAmount: 29900, currency: 'eur', active: false, interval: 'year' },
          {
            id: 'price_hotel_pro',
            unitAmount: 149000,
            currency: 'eur',
            active: true,
            interval: 'month',
          },
        ],
      }),
    );
    expect(kinds(r)).toEqual(['price_drift', 'price_drift', 'price_drift', 'price_drift']);
    expect(r.issues[0]).toMatchObject({ expected: 14900, actual: 15900 });
    expect(r.issues[3]).toMatchObject({ expected: 'year', actual: 'month' });
  });

  it('reconciles hotels the same way', () => {
    const r = reconcileBilling(
      input({
        subscriptions: [
          sub(),
          sub({
            id: 'sub_h',
            metadata: { kind: 'hotel_plan', hotelId: 'h-1' },
            status: 'past_due',
            priceId: 'price_hotel_basic',
          }),
        ],
        hotels: [hotel()],
      }),
    );
    expect(kinds(r)).toEqual(['status_mismatch']);
    expect(r.issues[0]?.fix).toEqual({ action: 'sync_hotel', hotelId: 'h-1' });
  });

  it('flags a hotel whose Stripe price maps to a different package', () => {
    const r = reconcileBilling(
      input({
        subscriptions: [
          sub(),
          sub({
            id: 'sub_h',
            metadata: { kind: 'hotel_plan', hotelId: 'h-1' },
            priceId: 'price_hotel_pro',
          }),
        ],
        hotels: [hotel({ plan: 'basic' })],
      }),
    );
    expect(kinds(r)).toEqual(['plan_mismatch']);
    expect(r.issues[0]).toMatchObject({
      expected: 'professional',
      actual: 'basic',
      fix: { action: 'sync_hotel', hotelId: 'h-1' },
    });
  });

  it('warns about live subscriptions on prices we no longer sell', () => {
    const r = reconcileBilling(
      input({
        subscriptions: [
          sub(),
          sub({
            id: 'sub_h',
            metadata: { kind: 'hotel_plan', hotelId: 'h-1' },
            priceId: 'price_old_monthly',
          }),
        ],
        hotels: [hotel()],
      }),
    );
    expect(kinds(r)).toEqual(['legacy_price']);
    expect(r.ok).toBe(true);
  });

  it('releases launch-offer slots that were claimed but never paid', () => {
    const stale = new Date(Date.parse(NOW) - 5 * 24 * 60 * 60 * 1000).toISOString();
    const fresh = new Date(Date.parse(NOW) - 60 * 60 * 1000).toISOString();
    const r = reconcileBilling(
      input({
        hotels: [
          hotel({
            id: 'h-stale',
            stripe_subscription_id: null,
            billing_status: 'checkout_sent',
            launch_offer_applied: true,
            launch_offer_claimed_at: stale,
          }),
          hotel({
            id: 'h-fresh',
            stripe_subscription_id: null,
            billing_status: 'checkout_sent',
            launch_offer_applied: true,
            launch_offer_claimed_at: fresh,
          }),
        ],
      }),
    );
    expect(kinds(r)).toEqual(['launch_offer_stale']);
    expect(r.issues[0]?.fix).toEqual({ action: 'release_launch_offer', hotelId: 'h-stale' });
    expect(r.summary.launchOfferClaimed).toBe(2);
  });

  it('warns about email drift and leftover partnership subscriptions', () => {
    const r = reconcileBilling(
      input({
        customers: [{ id: 'cus_1', email: 'other@example.com' }],
        partnerships: [
          { id: 'p-1', stripe_subscription_id: 'sub_legacy', billing_status: 'active' },
        ],
      }),
    );
    expect(kinds(r).sort()).toEqual(['customer_email_drift', 'legacy_partnership_subscription']);
    expect(r.ok).toBe(true); // warnings only
  });
});

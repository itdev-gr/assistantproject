import { describe, expect, it } from 'vitest';
import {
  applyStripeEvent,
  billingStatusFromStripe,
  subscriptionToBillingState,
  tierFromSubscription,
  type StripeEventLike,
} from './stripe-billing-events';

const ev = (type: string, object: Record<string, unknown>): StripeEventLike => ({
  id: 'evt_1',
  type,
  data: { object },
});

const PRICES = { price_std: 'standard', price_feat: 'featured', price_exc: 'exclusive' } as const;

describe('billingStatusFromStripe', () => {
  it('maps every Stripe status, failing closed for unknown ones', () => {
    expect(billingStatusFromStripe('active')).toBe('active');
    expect(billingStatusFromStripe('trialing')).toBe('active');
    expect(billingStatusFromStripe('past_due')).toBe('past_due');
    expect(billingStatusFromStripe('paused')).toBe('past_due');
    expect(billingStatusFromStripe('incomplete')).toBe('checkout_sent');
    expect(billingStatusFromStripe('unpaid')).toBe('canceled');
    expect(billingStatusFromStripe('canceled')).toBe('canceled');
    expect(billingStatusFromStripe('incomplete_expired')).toBe('canceled');
    expect(billingStatusFromStripe('something_new')).toBe('canceled');
    expect(billingStatusFromStripe(null)).toBe('canceled');
  });
});

describe('subscriptionToBillingState', () => {
  const sub = {
    id: 'sub_1',
    status: 'active',
    metadata: { kind: 'business_plan', tier: 'standard' },
    items: { data: [{ price: { id: 'price_feat' }, current_period_end: 1_800_000_000 }] },
  };

  it('derives tier from the item price (portal plan switches win over checkout metadata)', () => {
    expect(subscriptionToBillingState(sub, PRICES)).toEqual({
      billing_status: 'active',
      subscription_tier: 'featured',
      stripe_subscription_id: 'sub_1',
      current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
    });
  });

  it('falls back to checkout metadata when the price is unknown', () => {
    expect(tierFromSubscription(sub, {})).toBe('standard');
    expect(subscriptionToBillingState(sub, {}).subscription_tier).toBe('standard');
  });

  it('reads current_period_end from the subscription on legacy API shapes', () => {
    const legacy = { ...sub, items: { data: [{ price: 'price_std' }] }, current_period_end: 1_700_000_000 };
    expect(subscriptionToBillingState(legacy, PRICES).current_period_end).toBe(
      new Date(1_700_000_000 * 1000).toISOString(),
    );
  });

  it('clears everything on a canceled subscription', () => {
    expect(subscriptionToBillingState({ ...sub, status: 'canceled' }, PRICES)).toEqual({
      billing_status: 'canceled',
      subscription_tier: 'free',
      stripe_subscription_id: null,
      current_period_end: null,
    });
  });

  it('returns null tier when nothing resolves', () => {
    expect(tierFromSubscription({ id: 'sub_x', status: 'active', metadata: {} }, PRICES)).toBeNull();
  });
});

describe('applyStripeEvent', () => {
  it('activates a business plan on a paid checkout', () => {
    const actions = applyStripeEvent(
      ev('checkout.session.completed', {
        subscription: 'sub_b1',
        payment_status: 'paid',
        metadata: { kind: 'business_plan', businessId: 'b-1', tier: 'featured' },
      }),
    );
    expect(actions).toEqual([
      {
        target: 'business',
        match: { id: 'b-1' },
        set: { subscription_tier: 'featured', billing_status: 'active', stripe_subscription_id: 'sub_b1' },
      },
    ]);
  });

  it('ignores a completed checkout whose payment is still pending', () => {
    const actions = applyStripeEvent(
      ev('checkout.session.completed', {
        subscription: 'sub_b1',
        payment_status: 'unpaid',
        metadata: { kind: 'business_plan', businessId: 'b-1', tier: 'featured' },
      }),
    );
    expect(actions).toEqual([]);
  });

  it('ignores a business checkout with a free or unknown tier', () => {
    const actions = applyStripeEvent(
      ev('checkout.session.completed', {
        subscription: 'sub_b1',
        payment_status: 'paid',
        metadata: { kind: 'business_plan', businessId: 'b-1', tier: 'free' },
      }),
    );
    expect(actions).toEqual([]);
  });

  it('activates a partnership tier on completed checkout (legacy flow)', () => {
    const actions = applyStripeEvent(
      ev('checkout.session.completed', {
        subscription: 'sub_123',
        metadata: { kind: 'partnership_tier', partnershipId: 'p-1', tier: 'featured' },
      }),
    );
    expect(actions).toEqual([
      {
        target: 'partnership',
        match: { id: 'p-1' },
        set: { subscription_tier: 'featured', billing_status: 'active', stripe_subscription_id: 'sub_123' },
      },
    ]);
  });

  it('activates a hotel plan on completed checkout', () => {
    const actions = applyStripeEvent(
      ev('checkout.session.completed', {
        subscription: 'sub_h1',
        metadata: { kind: 'hotel_plan', hotelId: 'h-1' },
      }),
    );
    expect(actions).toEqual([
      { target: 'hotel', match: { id: 'h-1' }, set: { billing_status: 'active', stripe_subscription_id: 'sub_h1' } },
    ]);
  });

  it('marks past_due on failed subscription invoice across all subscription holders', () => {
    const actions = applyStripeEvent(ev('invoice.payment_failed', { subscription: 'sub_123' }));
    expect(actions).toEqual([
      { target: 'business', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
      { target: 'hotel', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
    ]);
  });

  it('marks past_due on failed subscription invoice using the current API subscription shape', () => {
    const actions = applyStripeEvent(
      ev('invoice.payment_failed', { parent: { subscription_details: { subscription: 'sub_123' } } }),
    );
    expect(actions.map((a) => a.target)).toEqual(['business', 'partnership', 'hotel']);
    expect(actions.every((a) => 'stripe_subscription_id' in a.match && a.match.stripe_subscription_id === 'sub_123')).toBe(true);
  });

  it('recovers to active when a subscription invoice is paid', () => {
    const actions = applyStripeEvent(ev('invoice.paid', { subscription: 'sub_123' }));
    expect(actions).toEqual([
      { target: 'business', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'active' } },
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'active' } },
      { target: 'hotel', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'active' } },
    ]);
  });

  it('recovers to active when a subscription invoice is paid using the current API subscription shape', () => {
    const actions = applyStripeEvent(
      ev('invoice.paid', { parent: { subscription_details: { subscription: { id: 'sub_123' } } } }),
    );
    expect(actions.map((a) => a.target)).toEqual(['business', 'partnership', 'hotel']);
  });

  it('marks commission events paid when a manual invoice is paid', () => {
    const actions = applyStripeEvent(ev('invoice.paid', { id: 'in_1', billing_reason: 'manual' }));
    expect(actions).toEqual([
      { target: 'commission_events', match: { stripe_invoice_id: 'in_1' }, set: { state: 'paid' } },
    ]);
  });

  it('demotes business and partnership to free on subscription deletion', () => {
    const actions = applyStripeEvent(ev('customer.subscription.deleted', { id: 'sub_123', metadata: {} }));
    expect(actions).toEqual([
      {
        target: 'business',
        match: { stripe_subscription_id: 'sub_123' },
        set: { subscription_tier: 'free', billing_status: 'canceled', stripe_subscription_id: null, current_period_end: null },
      },
      {
        target: 'partnership',
        match: { stripe_subscription_id: 'sub_123' },
        set: { subscription_tier: 'free', billing_status: 'canceled', stripe_subscription_id: null },
      },
    ]);
  });

  it('cancels a hotel plan on subscription deletion', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.deleted', { id: 'sub_h1', metadata: { kind: 'hotel_plan' } }),
    );
    expect(actions).toEqual([
      {
        target: 'hotel',
        match: { stripe_subscription_id: 'sub_h1' },
        set: { billing_status: 'canceled', stripe_subscription_id: null },
      },
    ]);
  });

  it('marks a business past_due on subscription.updated and keeps the tier when the price is unknown', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.updated', { id: 'sub_123', status: 'past_due', metadata: {} }),
    );
    expect(actions).toEqual([
      {
        target: 'business',
        match: { stripe_subscription_id: 'sub_123' },
        set: { billing_status: 'past_due', current_period_end: null },
      },
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
    ]);
  });

  it('propagates a portal plan switch through subscription.updated', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.updated', {
        id: 'sub_123',
        status: 'active',
        metadata: { kind: 'business_plan', tier: 'standard' },
        items: { data: [{ price: { id: 'price_exc' }, current_period_end: 1_800_000_000 }] },
      }),
      PRICES,
    );
    expect(actions[0]).toEqual({
      target: 'business',
      match: { stripe_subscription_id: 'sub_123' },
      set: {
        billing_status: 'active',
        current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
        subscription_tier: 'exclusive',
      },
    });
  });

  it('treats an unpaid subscription as canceled on subscription.updated (fails closed)', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.updated', { id: 'sub_123', status: 'unpaid', metadata: {} }),
    );
    expect(actions[0]).toEqual({
      target: 'business',
      match: { stripe_subscription_id: 'sub_123' },
      set: { billing_status: 'canceled', subscription_tier: 'free', stripe_subscription_id: null, current_period_end: null },
    });
  });

  it('marks a hotel plan active on subscription.updated', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.updated', { id: 'sub_h1', status: 'active', metadata: { kind: 'hotel_plan' } }),
    );
    expect(actions).toEqual([
      { target: 'hotel', match: { stripe_subscription_id: 'sub_h1' }, set: { billing_status: 'active' } },
    ]);
  });

  it('returns no actions for unknown events', () => {
    expect(applyStripeEvent(ev('charge.refunded', { id: 'ch_1' }))).toEqual([]);
  });
});

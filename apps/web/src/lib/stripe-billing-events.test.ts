import { describe, expect, it } from 'vitest';
import { applyStripeEvent, type StripeEventLike } from './stripe-billing-events';

const ev = (type: string, object: Record<string, unknown>): StripeEventLike => ({
  id: 'evt_1',
  type,
  data: { object },
});

describe('applyStripeEvent', () => {
  it('activates a partnership tier on completed checkout', () => {
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

  it('marks past_due on failed subscription invoice', () => {
    const actions = applyStripeEvent(
      ev('invoice.payment_failed', { subscription: 'sub_123' }),
    );
    expect(actions).toEqual([
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
      { target: 'hotel', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
    ]);
  });

  it('marks past_due on failed subscription invoice using the current API subscription shape', () => {
    const actions = applyStripeEvent(
      ev('invoice.payment_failed', {
        parent: { subscription_details: { subscription: 'sub_123' } },
      }),
    );
    expect(actions).toEqual([
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
      { target: 'hotel', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
    ]);
  });

  it('demotes to free on subscription deletion', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.deleted', { id: 'sub_123', metadata: { kind: 'partnership_tier' } }),
    );
    expect(actions).toEqual([
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
      { target: 'hotel', match: { stripe_subscription_id: 'sub_h1' }, set: { billing_status: 'canceled', stripe_subscription_id: null } },
    ]);
  });

  it('recovers to active when a subscription invoice is paid', () => {
    const actions = applyStripeEvent(
      ev('invoice.paid', { id: 'in_1', subscription: 'sub_123', billing_reason: 'subscription_cycle' }),
    );
    expect(actions).toEqual([
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'active' } },
      { target: 'hotel', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'active' } },
    ]);
  });

  it('recovers to active when a subscription invoice is paid using the current API subscription shape', () => {
    const actions = applyStripeEvent(
      ev('invoice.paid', {
        id: 'in_1',
        billing_reason: 'subscription_cycle',
        parent: { subscription_details: { subscription: 'sub_123' } },
      }),
    );
    expect(actions).toEqual([
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'active' } },
      { target: 'hotel', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'active' } },
    ]);
  });

  it('marks commission events paid when a manual invoice is paid', () => {
    const actions = applyStripeEvent(
      ev('invoice.paid', { id: 'in_9', subscription: null, billing_reason: 'manual' }),
    );
    expect(actions).toEqual([
      { target: 'commission_events', match: { stripe_invoice_id: 'in_9' }, set: { state: 'paid' } },
    ]);
  });

  it('returns no actions for unknown events', () => {
    expect(applyStripeEvent(ev('customer.created', {}))).toEqual([]);
  });

  it('marks a partnership past_due on subscription.updated', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.updated', { id: 'sub_123', status: 'past_due', metadata: { kind: 'partnership_tier' } }),
    );
    expect(actions).toEqual([
      { target: 'partnership', match: { stripe_subscription_id: 'sub_123' }, set: { billing_status: 'past_due' } },
    ]);
  });

  it('marks a hotel plan active on subscription.updated', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.updated', { id: 'sub_h1', status: 'active', metadata: { kind: 'hotel_plan' } }),
    );
    expect(actions).toEqual([
      { target: 'hotel', match: { stripe_subscription_id: 'sub_h1' }, set: { billing_status: 'active' } },
    ]);
  });

  it('returns no actions for an unmapped status on subscription.updated', () => {
    const actions = applyStripeEvent(
      ev('customer.subscription.updated', { id: 'sub_123', status: 'incomplete_expired', metadata: {} }),
    );
    expect(actions).toEqual([]);
  });
});

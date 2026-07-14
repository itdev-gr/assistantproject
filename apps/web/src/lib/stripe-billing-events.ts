/**
 * Pure mapping from Stripe webhook events to database mutations. The webhook
 * route executes the returned actions; nothing else in the app mutates
 * billing state. Keep this file free of I/O so it stays unit-testable.
 */
export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

type Tier = 'free' | 'standard' | 'featured' | 'exclusive';
type BillingStatus = 'unbilled' | 'checkout_sent' | 'active' | 'past_due' | 'canceled';

export type BillingAction =
  | {
      target: 'partnership';
      match: { id: string } | { stripe_subscription_id: string };
      set: Partial<{
        subscription_tier: Tier;
        billing_status: BillingStatus;
        stripe_subscription_id: string | null;
      }>;
    }
  | {
      target: 'hotel';
      match: { id: string } | { stripe_subscription_id: string };
      set: Partial<{ billing_status: BillingStatus; stripe_subscription_id: string | null }>;
    }
  | { target: 'commission_events'; match: { stripe_invoice_id: string }; set: { state: 'paid' } };

const PAID_TIERS: ReadonlySet<string> = new Set(['standard', 'featured', 'exclusive']);

export function applyStripeEvent(event: StripeEventLike): BillingAction[] {
  const obj = event.data.object;
  const meta = (obj.metadata ?? {}) as Record<string, string>;

  switch (event.type) {
    case 'checkout.session.completed': {
      const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : null;
      if (!subscriptionId) return [];
      if (meta.kind === 'partnership_tier' && meta.partnershipId && meta.tier && PAID_TIERS.has(meta.tier)) {
        return [
          {
            target: 'partnership',
            match: { id: meta.partnershipId },
            set: {
              subscription_tier: meta.tier as Tier,
              billing_status: 'active',
              stripe_subscription_id: subscriptionId,
            },
          },
        ];
      }
      if (meta.kind === 'hotel_plan' && meta.hotelId) {
        return [
          {
            target: 'hotel',
            match: { id: meta.hotelId },
            set: { billing_status: 'active', stripe_subscription_id: subscriptionId },
          },
        ];
      }
      return [];
    }

    case 'invoice.payment_failed': {
      const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : null;
      if (!subscriptionId) return [];
      return [
        { target: 'partnership', match: { stripe_subscription_id: subscriptionId }, set: { billing_status: 'past_due' } },
        { target: 'hotel', match: { stripe_subscription_id: subscriptionId }, set: { billing_status: 'past_due' } },
      ];
    }

    case 'invoice.paid': {
      const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : null;
      if (subscriptionId) {
        return [
          { target: 'partnership', match: { stripe_subscription_id: subscriptionId }, set: { billing_status: 'active' } },
          { target: 'hotel', match: { stripe_subscription_id: subscriptionId }, set: { billing_status: 'active' } },
        ];
      }
      if (obj.billing_reason === 'manual' && typeof obj.id === 'string') {
        return [
          { target: 'commission_events', match: { stripe_invoice_id: obj.id }, set: { state: 'paid' } },
        ];
      }
      return [];
    }

    case 'customer.subscription.deleted': {
      const subscriptionId = typeof obj.id === 'string' ? obj.id : null;
      if (!subscriptionId) return [];
      if (meta.kind === 'hotel_plan') {
        return [
          {
            target: 'hotel',
            match: { stripe_subscription_id: subscriptionId },
            set: { billing_status: 'canceled', stripe_subscription_id: null },
          },
        ];
      }
      return [
        {
          target: 'partnership',
          match: { stripe_subscription_id: subscriptionId },
          set: { subscription_tier: 'free', billing_status: 'canceled', stripe_subscription_id: null },
        },
      ];
    }

    default:
      return [];
  }
}

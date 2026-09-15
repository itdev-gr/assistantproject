/**
 * Pure mapping from Stripe objects to database billing state.
 *
 * `subscriptionToBillingState` is THE place a Stripe subscription becomes a
 * `{ billing_status, subscription_tier, … }` row. The webhook route, the
 * partner "sync after checkout" action and the nightly reconciler all call
 * it, so the three can never disagree. Keep this file free of I/O.
 */
import { isHotelPlan, type HotelPlan } from './hotel-plans';

export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export type Tier = 'free' | 'standard' | 'featured' | 'exclusive';
export type BillingStatus = 'unbilled' | 'checkout_sent' | 'active' | 'past_due' | 'canceled';

/** Stripe price id → paid tier (built from the STRIPE_PRICE_* env vars). */
export type PriceToTier = Readonly<Record<string, Exclude<Tier, 'free'>>>;
/** Stripe price id → hotel package (built from the STRIPE_PRICE_HOTEL_* env vars). */
export type PriceToHotelPlan = Readonly<Record<string, HotelPlan>>;

export interface HotelBillingState {
  billing_status: BillingStatus;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  /** null when the price/metadata did not resolve to a package (keep the DB value). */
  plan: HotelPlan | null;
}

export interface BusinessBillingState {
  billing_status: BillingStatus;
  subscription_tier: Tier;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

export type BillingAction =
  | {
      target: 'business';
      match: { id: string } | { stripe_subscription_id: string };
      set: Partial<BusinessBillingState>;
    }
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
      set: Partial<{
        billing_status: BillingStatus;
        stripe_subscription_id: string | null;
        current_period_end: string | null;
        plan: HotelPlan;
      }>;
    }
  | { target: 'commission_events'; match: { stripe_invoice_id: string }; set: { state: 'paid' } };

const PAID_TIERS: ReadonlySet<string> = new Set(['standard', 'featured', 'exclusive']);

/**
 * Stripe subscription status → our billing status. Anything that means "not
 * paying" collapses to `canceled` so a lapsed subscription can never keep a
 * listing live (fail closed).
 */
export function billingStatusFromStripe(status: string | null | undefined): BillingStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'paused':
      return 'past_due';
    case 'incomplete':
      return 'checkout_sent';
    case 'unpaid':
    case 'canceled':
    case 'incomplete_expired':
    default:
      return 'canceled';
  }
}

function firstItem(sub: Record<string, unknown>): Record<string, unknown> | undefined {
  return ((sub.items as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [])[0];
}

/**
 * Paid tier of a subscription: the price on its first item (portal plan
 * switches change this), falling back to the `tier` metadata written at
 * checkout. `null` when neither resolves (e.g. STRIPE_PRICE_* not configured).
 */
export function tierFromSubscription(
  sub: Record<string, unknown>,
  priceToTier: PriceToTier = {},
): Exclude<Tier, 'free'> | null {
  const rawPrice = firstItem(sub)?.price;
  const priceId =
    typeof rawPrice === 'string'
      ? rawPrice
      : rawPrice && typeof rawPrice === 'object'
        ? (rawPrice as { id?: unknown }).id
        : undefined;
  const fromPrice = typeof priceId === 'string' ? priceToTier[priceId] : undefined;
  if (fromPrice) return fromPrice;
  const meta = (sub.metadata ?? {}) as Record<string, string>;
  return PAID_TIERS.has(meta.tier ?? '') ? (meta.tier as Exclude<Tier, 'free'>) : null;
}

/** Renewal date: stripe v22 (API 2026-06-24) moved current_period_end onto the item. */
export function periodEndFromSubscription(sub: Record<string, unknown>): string | null {
  const first = firstItem(sub);
  const seconds =
    typeof first?.current_period_end === 'number'
      ? first.current_period_end
      : typeof sub.current_period_end === 'number'
        ? sub.current_period_end
        : null;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Package of a hotel subscription: the price on its first item (portal plan
 * switches change this), falling back to the `plan` metadata written at
 * checkout. `null` when neither resolves (legacy or unconfigured price).
 */
export function hotelPlanFromSubscription(
  sub: Record<string, unknown>,
  priceToHotelPlan: PriceToHotelPlan = {},
): HotelPlan | null {
  const rawPrice = firstItem(sub)?.price;
  const priceId =
    typeof rawPrice === 'string'
      ? rawPrice
      : rawPrice && typeof rawPrice === 'object'
        ? (rawPrice as { id?: unknown }).id
        : undefined;
  const fromPrice = typeof priceId === 'string' ? priceToHotelPlan[priceId] : undefined;
  if (fromPrice) return fromPrice;
  const meta = (sub.metadata ?? {}) as Record<string, string>;
  return isHotelPlan(meta.plan) ? meta.plan : null;
}

/** Subscription → the exact billing state a hotel row should have. */
export function hotelSubscriptionToState(
  sub: Record<string, unknown>,
  priceToHotelPlan: PriceToHotelPlan = {},
): HotelBillingState {
  const id = typeof sub.id === 'string' ? sub.id : null;
  const billingStatus = billingStatusFromStripe(typeof sub.status === 'string' ? sub.status : null);
  const canceled = billingStatus === 'canceled';
  return {
    billing_status: billingStatus,
    stripe_subscription_id: canceled ? null : id,
    current_period_end: canceled ? null : periodEndFromSubscription(sub),
    // A lapsed subscription keeps the package on record (re-subscribe preselects it).
    plan: canceled ? null : hotelPlanFromSubscription(sub, priceToHotelPlan),
  };
}

/** Subscription → the exact row state a business should have. */
export function subscriptionToBillingState(
  sub: Record<string, unknown>,
  priceToTier: PriceToTier = {},
): BusinessBillingState {
  const id = typeof sub.id === 'string' ? sub.id : null;
  const billingStatus = billingStatusFromStripe(typeof sub.status === 'string' ? sub.status : null);
  const canceled = billingStatus === 'canceled';
  return {
    billing_status: billingStatus,
    subscription_tier: canceled ? 'free' : (tierFromSubscription(sub, priceToTier) ?? 'free'),
    stripe_subscription_id: canceled ? null : id,
    current_period_end: canceled ? null : periodEndFromSubscription(sub),
  };
}

/**
 * Invoice objects on API versions before 2026-06-24.dahlia carry the
 * subscription id at the top level (`invoice.subscription`). Current Stripe
 * API versions moved it to `invoice.parent.subscription_details.subscription`
 * (string id, or an expanded Subscription object). Support both shapes.
 */
function invoiceSubscriptionId(obj: Record<string, unknown>): string | null {
  if (typeof obj.subscription === 'string') return obj.subscription; // legacy shape
  const parent = obj.parent as
    | { subscription_details?: { subscription?: unknown } }
    | null
    | undefined;
  const sub = parent?.subscription_details?.subscription;
  if (typeof sub === 'string') return sub;
  if (sub && typeof sub === 'object' && typeof (sub as { id?: unknown }).id === 'string')
    return (sub as { id: string }).id;
  return null;
}

/**
 * Event → DB mutations. Actions matched by `stripe_subscription_id` fan out to
 * every table that can hold a subscription (business / partnership / hotel);
 * the webhook counts a delivery as processed when at least one row matched.
 */
export function applyStripeEvent(
  event: StripeEventLike,
  priceToTier: PriceToTier = {},
  priceToHotelPlan: PriceToHotelPlan = {},
): BillingAction[] {
  const obj = event.data.object;
  const meta = (obj.metadata ?? {}) as Record<string, string>;

  switch (event.type) {
    case 'checkout.session.completed': {
      const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : null;
      if (!subscriptionId) return [];
      // Delayed payment methods complete the session before money moves; only
      // a paid session activates anything. (Absent field = legacy fixture.)
      if (typeof obj.payment_status === 'string' && obj.payment_status !== 'paid') return [];

      if (meta.kind === 'business_plan' && meta.businessId && PAID_TIERS.has(meta.tier ?? '')) {
        return [
          {
            target: 'business',
            match: { id: meta.businessId },
            set: {
              subscription_tier: meta.tier as Tier,
              billing_status: 'active',
              stripe_subscription_id: subscriptionId,
            },
          },
        ];
      }
      if (
        meta.kind === 'partnership_tier' &&
        meta.partnershipId &&
        meta.tier &&
        PAID_TIERS.has(meta.tier)
      ) {
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
            set: {
              billing_status: 'active',
              stripe_subscription_id: subscriptionId,
              ...(isHotelPlan(meta.plan) ? { plan: meta.plan } : {}),
            },
          },
        ];
      }
      return [];
    }

    case 'invoice.payment_failed': {
      const subscriptionId = invoiceSubscriptionId(obj);
      if (!subscriptionId) return [];
      return [
        {
          target: 'business',
          match: { stripe_subscription_id: subscriptionId },
          set: { billing_status: 'past_due' },
        },
        {
          target: 'partnership',
          match: { stripe_subscription_id: subscriptionId },
          set: { billing_status: 'past_due' },
        },
        {
          target: 'hotel',
          match: { stripe_subscription_id: subscriptionId },
          set: { billing_status: 'past_due' },
        },
      ];
    }

    case 'invoice.paid': {
      const subscriptionId = invoiceSubscriptionId(obj);
      if (subscriptionId) {
        return [
          {
            target: 'business',
            match: { stripe_subscription_id: subscriptionId },
            set: { billing_status: 'active' },
          },
          {
            target: 'partnership',
            match: { stripe_subscription_id: subscriptionId },
            set: { billing_status: 'active' },
          },
          {
            target: 'hotel',
            match: { stripe_subscription_id: subscriptionId },
            set: { billing_status: 'active' },
          },
        ];
      }
      if (obj.billing_reason === 'manual' && typeof obj.id === 'string') {
        return [
          {
            target: 'commission_events',
            match: { stripe_invoice_id: obj.id },
            set: { state: 'paid' },
          },
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
            set: {
              billing_status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
            },
          },
        ];
      }
      const canceled = {
        subscription_tier: 'free' as Tier,
        billing_status: 'canceled' as BillingStatus,
        stripe_subscription_id: null,
      };
      return [
        {
          target: 'business',
          match: { stripe_subscription_id: subscriptionId },
          set: { ...canceled, current_period_end: null },
        },
        { target: 'partnership', match: { stripe_subscription_id: subscriptionId }, set: canceled },
      ];
    }

    case 'customer.subscription.updated': {
      const subscriptionId = typeof obj.id === 'string' ? obj.id : null;
      if (!subscriptionId) return [];
      const state = subscriptionToBillingState(obj, priceToTier);
      if (meta.kind === 'hotel_plan') {
        const hotel = hotelSubscriptionToState(obj, priceToHotelPlan);
        const hotelSet: BillingAction['set'] & { target?: never } =
          hotel.billing_status === 'canceled'
            ? { billing_status: 'canceled', stripe_subscription_id: null, current_period_end: null }
            : {
                billing_status: hotel.billing_status,
                current_period_end: hotel.current_period_end,
                // Only touch the package when the price resolved; an unmapped
                // (legacy) price must never demote a paying hotel.
                ...(hotel.plan ? { plan: hotel.plan } : {}),
              };
        return [
          { target: 'hotel', match: { stripe_subscription_id: subscriptionId }, set: hotelSet },
        ];
      }
      // Business rows get the full derived state (tier follows the price, so
      // a plan switch in the customer portal propagates); partnerships keep
      // the legacy status-only update.
      const tier = tierFromSubscription(obj, priceToTier);
      const businessSet: Partial<BusinessBillingState> =
        state.billing_status === 'canceled'
          ? state
          : {
              billing_status: state.billing_status,
              current_period_end: state.current_period_end,
              // Only touch the tier when the price actually resolved; a
              // missing STRIPE_PRICE_* env must never demote a paying business.
              ...(tier ? { subscription_tier: tier } : {}),
            };
      return [
        { target: 'business', match: { stripe_subscription_id: subscriptionId }, set: businessSet },
        {
          target: 'partnership',
          match: { stripe_subscription_id: subscriptionId },
          set: { billing_status: state.billing_status },
        },
      ];
    }

    default:
      return [];
  }
}

/** Table for each action target (used by the webhook and the replay action). */
export function tableForTarget(
  target: BillingAction['target'],
): 'businesses' | 'partnerships' | 'hotels' | 'commission_events' {
  switch (target) {
    case 'business':
      return 'businesses';
    case 'partnership':
      return 'partnerships';
    case 'hotel':
      return 'hotels';
    case 'commission_events':
      return 'commission_events';
  }
}

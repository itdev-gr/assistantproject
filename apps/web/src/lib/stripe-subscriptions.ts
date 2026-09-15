import type Stripe from 'stripe';
import { getStripe } from './stripe';

/** A live (non-ended) subscription for this customer, if Stripe has one. */
export async function findLiveSubscription(
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const list = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });
  return (
    list.data.find((s) => s.status !== 'canceled' && s.status !== 'incomplete_expired') ?? null
  );
}

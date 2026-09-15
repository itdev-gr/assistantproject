import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import {
  applyStripeEvent,
  tableForTarget,
  type BillingAction,
  type BusinessBillingState,
  type HotelBillingState,
  type StripeEventLike,
} from './stripe-billing-events';
import { priceToHotelPlanMap, priceToTierMap } from './stripe';
import { reindexHotelKnowledge } from './knowledge-indexer';

type DB = SupabaseClient<Database>;

/**
 * Executes one billing action and returns how many rows it touched. Callers
 * treat "zero rows across the whole event" as a failure so a stale or wrong
 * subscription id never gets silently acknowledged.
 */
export async function runBillingAction(admin: DB, action: BillingAction): Promise<number> {
  const table = tableForTarget(action.target);
  const entry = Object.entries(action.match)[0];
  if (!entry) throw new Error(`${table} update missing match column`);
  const [column, value] = entry;
  const { data, error } = await admin
    .from(table)
    .update(action.set as never)
    .eq(column, value as string)
    .select('id');
  if (error) throw new Error(`${table} update failed: ${error.message}`);
  return data?.length ?? 0;
}

/** Writes the derived subscription state onto a business row. */
export async function applyBusinessBillingState(
  admin: DB,
  businessId: string,
  state: BusinessBillingState,
): Promise<void> {
  const { error } = await admin.from('businesses').update(state).eq('id', businessId);
  if (error) throw new Error(`businesses update failed: ${error.message}`);
}

/** Writes the derived subscription state onto a hotel row (package only when resolved). */
export async function applyHotelBillingState(
  admin: DB,
  hotelId: string,
  state: HotelBillingState,
): Promise<void> {
  const { plan, ...rest } = state;
  const { error } = await admin
    .from('hotels')
    .update({ ...rest, ...(plan ? { plan } : {}) })
    .eq('id', hotelId);
  if (error) throw new Error(`hotels update failed: ${error.message}`);
}

/**
 * The assistant's knowledge index is rebuilt nightly; when a business stops
 * (or starts) being listed, refresh the hotels it is connected to right away
 * so the assistant never cites a lapsed listing for a whole day.
 */
export async function reindexBusinessPartners(admin: DB, businessId: string): Promise<void> {
  const { data } = await admin
    .from('partnerships')
    .select('hotel_id')
    .eq('business_id', businessId)
    .eq('active', true);
  const hotelIds = [...new Set((data ?? []).map((p) => p.hotel_id))];
  for (const hotelId of hotelIds) {
    try {
      await reindexHotelKnowledge(admin, hotelId);
    } catch (err) {
      console.error(
        'reindex after billing change failed',
        hotelId,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

/** Business ids touched by a set of actions (for post-processing hooks). */
export async function businessIdsForActions(
  admin: DB,
  actions: BillingAction[],
): Promise<string[]> {
  const ids = new Set<string>();
  for (const a of actions) {
    if (a.target !== 'business') continue;
    if ('id' in a.match) {
      ids.add(a.match.id);
    } else {
      const { data } = await admin
        .from('businesses')
        .select('id')
        .eq('stripe_subscription_id', a.match.stripe_subscription_id)
        .maybeSingle();
      if (data?.id) ids.add(data.id);
    }
  }
  return [...ids];
}

/**
 * Runs the mapper for one stored event and records the outcome on its row.
 * Shared with the admin "replay" action and the reconciler.
 */
export async function processStoredEvent(
  admin: DB,
  event: StripeEventLike,
): Promise<{ ok: boolean; matched: number; businessIds: string[]; error?: string }> {
  const actions = applyStripeEvent(event, priceToTierMap(), priceToHotelPlanMap());
  let matched = 0;
  const errors: string[] = [];
  for (const action of actions) {
    try {
      matched += await runBillingAction(admin, action);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  // Fan-out actions legitimately miss two of three tables; an event that
  // matched nothing at all points at a subscription we don't know.
  if (actions.length > 0 && matched === 0 && errors.length === 0) {
    errors.push('no matching row for any action');
  }

  if (errors.length > 0) {
    const message = errors.join('; ').slice(0, 1000);
    const { data: row } = await admin
      .from('stripe_webhook_events')
      .select('attempts')
      .eq('id', event.id)
      .maybeSingle();
    await admin
      .from('stripe_webhook_events')
      .update({
        error: message,
        attempts: (row?.attempts ?? 0) + 1,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', event.id);
    console.error(`stripe webhook ${event.id} (${event.type}) failed: ${message}`);
    return { ok: false, matched, businessIds: [], error: message };
  }

  await admin
    .from('stripe_webhook_events')
    .update({ processed_at: new Date().toISOString(), error: null })
    .eq('id', event.id);
  const businessIds = await businessIdsForActions(admin, actions);
  return { ok: true, matched, businessIds };
}

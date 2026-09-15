import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import {
  HOTEL_FEATURES,
  HOTEL_FEATURE_FLAG,
  hotelPlanFeatures,
  type HotelFeature,
  type HotelPlan,
} from './hotel-plans';

type DB = SupabaseClient<Database>;

export interface HotelPlanRef {
  id: string;
  plan: HotelPlan;
}

export interface FeatureFlagRow {
  hotel_id: string | null;
  flag: string;
  enabled: boolean;
}

/**
 * Feature resolution for a hotel:
 *   1. a per-hotel `feature_flags` row wins (admin override either way),
 *   2. otherwise the package decides (`hotelPlanFeatures`).
 * Global rows (`hotel_id is null`) predate packages and are ignored here so a
 * historical "llm_chat = false" default cannot switch paying hotels off.
 * Pure, so the precedence is unit-tested.
 */
export function resolveHotelFeatures(
  plan: HotelPlan,
  rows: FeatureFlagRow[],
): Record<HotelFeature, boolean> {
  const out = { ...hotelPlanFeatures(plan) };
  for (const feature of HOTEL_FEATURES) {
    const flag = HOTEL_FEATURE_FLAG[feature];
    const override = rows.find((r) => r.flag === flag && r.hotel_id != null);
    if (override) out[feature] = override.enabled;
  }
  return out;
}

async function readFlags(admin: DB, hotelId: string): Promise<FeatureFlagRow[]> {
  const { data } = await admin
    .from('feature_flags')
    .select('hotel_id, flag, enabled')
    .eq('hotel_id', hotelId)
    .in('flag', Object.values(HOTEL_FEATURE_FLAG));
  return (data ?? []) as FeatureFlagRow[];
}

/** Every feature for one hotel in a single query. */
export async function hotelFeatureSet(
  admin: DB,
  hotel: HotelPlanRef,
): Promise<Record<HotelFeature, boolean>> {
  return resolveHotelFeatures(hotel.plan, await readFlags(admin, hotel.id));
}

/** The single place to ask "may this hotel use X?". */
export async function hotelHasFeature(
  admin: DB,
  hotel: HotelPlanRef,
  feature: HotelFeature,
): Promise<boolean> {
  return (await hotelFeatureSet(admin, hotel))[feature];
}

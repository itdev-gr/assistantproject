'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { recommendationRulesUpsertSchema, uuidSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';

export async function upsertRules(raw: unknown) {
  await requireSuperAdmin();
  const parsed = recommendationRulesUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const r = parsed.data;
  const admin = createSupabaseServiceClient();
  const row = {
    hotel_id: r.hotelId,
    semantic_weight: r.semanticWeight,
    proximity_weight: r.proximityWeight,
    time_match_weight: r.timeMatchWeight,
    category_weight: r.categoryWeight,
    preference_weight: r.preferenceWeight,
    partner_bias_weight: r.partnerBiasWeight,
    distance_penalty_per_km: r.distancePenaltyPerKm,
    tier_multipliers: r.tierMultipliers,
    max_results: r.maxResults,
  };
  const { error } = await admin
    .from('recommendation_rules')
    .upsert(row, { onConflict: 'hotel_id' });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(admin)/admin/rules', 'layout');
  return { ok: true as const };
}

const flagSchema = z.object({
  hotelId: uuidSchema.nullable(),
  flag: z.string().min(2).max(64),
  enabled: z.boolean(),
});

export async function setFeatureFlag(raw: unknown) {
  await requireSuperAdmin();
  const parsed = flagSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();
  const row = {
    hotel_id: parsed.data.hotelId,
    flag: parsed.data.flag,
    enabled: parsed.data.enabled,
  };
  const { error } = await admin
    .from('feature_flags')
    .upsert(row, { onConflict: 'hotel_id,flag' });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(admin)/admin/flags', 'layout');
  return { ok: true as const };
}

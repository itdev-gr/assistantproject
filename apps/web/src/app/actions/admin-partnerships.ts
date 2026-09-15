'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { MAX_COMMISSION_PCT, partnershipUpsertSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';

const idSchema = z.object({ id: z.string().uuid() });

/**
 * Commission is capped at 10% for new values. Rows created before the cap may
 * sit above it; toggling such a row (active / tier) resubmits the stored
 * commission unchanged, which is allowed — lowering is the only edit permitted.
 */
const legacySchema = partnershipUpsertSchema.extend({ commissionPct: z.number().min(0).max(100) });

export async function upsertPartnership(raw: unknown) {
  await requireSuperAdmin();
  const admin = createSupabaseServiceClient();
  let parsed = partnershipUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    const legacy = legacySchema.safeParse(raw);
    if (legacy.success && legacy.data.id && legacy.data.commissionPct > MAX_COMMISSION_PCT) {
      const { data: stored } = await admin
        .from('partnerships')
        .select('commission_pct')
        .eq('id', legacy.data.id)
        .maybeSingle();
      if (stored && Number(stored.commission_pct) === legacy.data.commissionPct) parsed = legacy;
    }
  }
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const p = parsed.data;

  const row = {
    hotel_id: p.hotelId,
    business_id: p.businessId,
    commission_pct: p.commissionPct,
    paid_priority_score: p.paidPriorityScore,
    subscription_tier: p.subscriptionTier,
    contract_starts: p.contractStarts,
    contract_ends: p.contractEnds,
    active: p.active,
    notes: p.notes,
  };

  if (p.id) {
    const { error } = await admin.from('partnerships').update(row).eq('id', p.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin
      .from('partnerships')
      .upsert(row, { onConflict: 'hotel_id,business_id' });
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/[locale]/(admin)/admin/partnerships', 'layout');
  return { ok: true as const };
}

export async function deletePartnership(input: unknown) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();
  const { error } = await admin.from('partnerships').delete().eq('id', parsed.data.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(admin)/admin/partnerships', 'layout');
  return { ok: true as const };
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { partnershipUpsertSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';

const idSchema = z.object({ id: z.string().uuid() });

export async function upsertPartnership(raw: unknown) {
  await requireSuperAdmin();
  const parsed = partnershipUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const p = parsed.data;
  const admin = createSupabaseServiceClient();

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

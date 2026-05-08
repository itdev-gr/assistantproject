'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hoursRowSchema } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';

const idSchema = z.object({ id: z.string().uuid() });

export async function upsertHours(raw: unknown) {
  const ctx = await requireOwner();
  const parsed = hoursRowSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const h = parsed.data;
  const supabase = await getServerClient();
  const row = {
    hotel_id: ctx.hotelId,
    entity_type: h.entityType,
    entity_ref: h.entityRef,
    weekday: h.weekday,
    opens: h.opens,
    closes: h.closes,
    seasonal_start: h.seasonalStart,
    seasonal_end: h.seasonalEnd,
  };
  if (h.id) {
    const { error } = await supabase
      .from('hours')
      .update(row)
      .eq('id', h.id)
      .eq('hotel_id', ctx.hotelId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from('hours').insert(row);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/[locale]/(owner)/owner/hours', 'layout');
  return { ok: true as const };
}

export async function deleteHours(input: unknown) {
  const ctx = await requireOwner();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('hours')
    .delete()
    .eq('id', parsed.data.id)
    .eq('hotel_id', ctx.hotelId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(owner)/owner/hours', 'layout');
  return { ok: true as const };
}

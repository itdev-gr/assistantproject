'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { roomUpsertSchema } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';

const idSchema = z.object({ id: z.string().uuid() });

export async function upsertRoom(raw: unknown) {
  const ctx = await requireOwner();
  const parsed = roomUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const r = parsed.data;
  const supabase = await getServerClient();
  const row = {
    hotel_id: ctx.hotelId,
    code: r.code,
    floor: r.floor,
    view: r.view,
    notes: r.notes,
  };
  if (r.id) {
    const { error } = await supabase
      .from('rooms')
      .update(row)
      .eq('id', r.id)
      .eq('hotel_id', ctx.hotelId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from('rooms').insert(row);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/[locale]/(owner)/owner/rooms', 'layout');
  return { ok: true as const };
}

export async function deleteRoom(input: unknown) {
  const ctx = await requireOwner();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', parsed.data.id)
    .eq('hotel_id', ctx.hotelId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(owner)/owner/rooms', 'layout');
  return { ok: true as const };
}

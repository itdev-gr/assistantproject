'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { amenityUpsertSchema } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';

type Result = { ok: true; id: string } | { ok: false; error: string };

export async function upsertAmenity(raw: unknown): Promise<Result> {
  const ctx = await requireOwner();
  const parsed = amenityUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const a = parsed.data;
  const supabase = await getServerClient();

  if (a.id) {
    const { data, error } = await supabase
      .from('amenities')
      .update({
        name: a.name,
        description: a.description,
        location_on_property: a.locationOnProperty,
        hours_json: a.hours ?? {},
        state: a.published ? 'published' : 'draft',
      })
      .eq('id', a.id)
      .eq('hotel_id', ctx.hotelId)
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'not_found' };
    revalidatePath('/[locale]/(owner)/owner/amenities', 'layout');
    return { ok: true, id: data.id };
  }

  const { data, error } = await supabase
    .from('amenities')
    .insert({
      hotel_id: ctx.hotelId,
      name: a.name,
      description: a.description,
      location_on_property: a.locationOnProperty,
      hours_json: a.hours ?? {},
      state: a.published ? 'published' : 'draft',
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };
  revalidatePath('/[locale]/(owner)/owner/amenities', 'layout');
  return { ok: true, id: data.id };
}

const idSchema = z.object({ id: z.string().uuid() });

export async function deleteAmenity(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireOwner();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('amenities')
    .delete()
    .eq('id', parsed.data.id)
    .eq('hotel_id', ctx.hotelId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/(owner)/owner/amenities', 'layout');
  return { ok: true };
}

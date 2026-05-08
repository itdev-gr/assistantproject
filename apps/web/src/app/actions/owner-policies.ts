'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { policyUpsertSchema } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';

const idSchema = z.object({ id: z.string().uuid() });

export async function upsertPolicy(raw: unknown) {
  const ctx = await requireOwner();
  const parsed = policyUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const p = parsed.data;
  const supabase = await getServerClient();
  if (p.id) {
    const { error } = await supabase
      .from('policies')
      .update({ kind: p.kind, body: p.body, locale: p.locale, state: 'published' })
      .eq('id', p.id)
      .eq('hotel_id', ctx.hotelId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from('policies')
      .upsert(
        {
          hotel_id: ctx.hotelId,
          kind: p.kind,
          body: p.body,
          locale: p.locale,
          state: 'published',
        },
        { onConflict: 'hotel_id,kind,locale' },
      );
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/[locale]/(owner)/owner/policies', 'layout');
  return { ok: true as const };
}

export async function deletePolicy(input: unknown) {
  const ctx = await requireOwner();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('policies')
    .delete()
    .eq('id', parsed.data.id)
    .eq('hotel_id', ctx.hotelId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(owner)/owner/policies', 'layout');
  return { ok: true as const };
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { faqUpsertSchema } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';

type Result = { ok: true; id: string } | { ok: false; error: string };

export async function upsertFaq(raw: unknown): Promise<Result> {
  const ctx = await requireOwner();
  const parsed = faqUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const f = parsed.data;
  const supabase = await getServerClient();

  if (f.id) {
    const { data, error } = await supabase
      .from('faqs')
      .update({
        locale: f.locale,
        question: f.question,
        answer: f.answer,
        tags: f.tags,
        intent_slug: f.intentSlug,
        state: f.published ? 'published' : 'draft',
        version: undefined,
      })
      .eq('id', f.id)
      .eq('hotel_id', ctx.hotelId)
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'not_found' };
    revalidatePath('/[locale]/(owner)/owner/faqs', 'layout');
    return { ok: true, id: data.id };
  }

  const { data, error } = await supabase
    .from('faqs')
    .insert({
      hotel_id: ctx.hotelId,
      locale: f.locale,
      question: f.question,
      answer: f.answer,
      tags: f.tags,
      intent_slug: f.intentSlug,
      state: f.published ? 'published' : 'draft',
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };
  revalidatePath('/[locale]/(owner)/owner/faqs', 'layout');
  return { ok: true, id: data.id };
}

const idSchema = z.object({ id: z.string().uuid() });

export async function deleteFaq(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireOwner();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('faqs')
    .delete()
    .eq('id', parsed.data.id)
    .eq('hotel_id', ctx.hotelId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/(owner)/owner/faqs', 'layout');
  return { ok: true };
}

export async function setFaqPublished(input: {
  id: string;
  published: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireOwner();
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('faqs')
    .update({ state: input.published ? 'published' : 'draft' })
    .eq('id', input.id)
    .eq('hotel_id', ctx.hotelId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/(owner)/owner/faqs', 'layout');
  return { ok: true };
}

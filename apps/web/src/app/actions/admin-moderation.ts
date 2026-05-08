'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';

const decideSchema = z.object({
  kind: z.enum(['faq', 'business']),
  id: z.string().uuid(),
  approve: z.boolean(),
});

export async function decideModeration(raw: unknown) {
  await requireSuperAdmin();
  const parsed = decideSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const { kind, id, approve } = parsed.data;
  const admin = createSupabaseServiceClient();
  if (kind === 'faq') {
    const { error } = await admin
      .from('faqs')
      .update({ state: approve ? 'published' : 'archived' })
      .eq('id', id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin
      .from('businesses')
      .update(approve ? { verified: true } : { active: false })
      .eq('id', id);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/[locale]/(admin)/admin/moderation', 'layout');
  return { ok: true as const };
}

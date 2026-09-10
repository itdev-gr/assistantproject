'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { approveBusinessListing, rejectBusinessListing } from '@/lib/partner-approval';

const decideSchema = z.object({
  kind: z.enum(['faq', 'business']),
  id: z.string().uuid(),
  approve: z.boolean(),
});

export async function decideModeration(raw: unknown) {
  const ctx = await requireSuperAdmin();
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
    const r = approve
      ? await approveBusinessListing(admin, id, ctx.userId)
      : await rejectBusinessListing(admin, id, ctx.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
  }
  revalidatePath('/[locale]/(admin)/admin/moderation', 'layout');
  revalidatePath('/[locale]/(admin)/admin/businesses', 'layout');
  revalidatePath('/[locale]/(admin)/admin/partners', 'layout');
  revalidatePath('/[locale]/(partner)/partner', 'layout');
  revalidatePath('/[locale]', 'page');
  return { ok: true as const };
}

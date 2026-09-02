'use server';

import { revalidatePath } from 'next/cache';
import { partnerBusinessUpdateSchema } from '@aga/api-contracts';
import type { Json } from '@aga/db/types';
import { requirePartner } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Partner edits their own listing. Ownership and the editable column set are
 * enforced by RLS + column grants (migration 0014); this runs through the
 * cookie-bound client on purpose.
 */
export async function updateMyBusiness(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requirePartner();
  const parsed = partnerBusinessUpdateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const b = parsed.data;
  if (ctx.role !== 'super_admin' && !ctx.businessIds.includes(b.id)) {
    return { ok: false, error: 'forbidden' };
  }
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('businesses')
    .update({
      name: b.name,
      description_i18n: (b.description ?? {}) as Json,
      phone: b.phone,
      whatsapp: b.whatsapp,
      website: b.website,
      price_band: b.priceBand,
      tags: b.tags,
      ...(b.openingHours !== undefined ? { opening_hours_json: b.openingHours as Json } : {}),
      images: b.images as unknown as Json,
    })
    .eq('id', b.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/(partner)/partner', 'layout');
  revalidatePath('/[locale]/p/[id]', 'page');
  revalidatePath('/[locale]', 'page');
  return { ok: true };
}

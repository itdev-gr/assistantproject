'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { businessUpsertSchema, businessCategoryUpsertSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';

const idSchema = z.object({ id: z.string().uuid() });

export async function upsertBusiness(raw: unknown) {
  await requireSuperAdmin();
  const parsed = businessUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const b = parsed.data;
  const admin = createSupabaseServiceClient();

  const row = {
    name: b.name,
    category_id: b.categoryId,
    description_i18n: b.description ?? {},
    lat: b.lat,
    lng: b.lng,
    address: b.address,
    phone: b.phone,
    whatsapp: b.whatsapp,
    website: b.website,
    price_band: b.priceBand,
    tags: b.tags,
    opening_hours_json: b.openingHours ?? {},
    images: b.images,
    verified: b.verified,
    active: b.active,
  };

  if (b.id) {
    const { error } = await admin.from('businesses').update(row).eq('id', b.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin.from('businesses').insert(row);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/[locale]/(admin)/admin/businesses', 'layout');
  return { ok: true as const };
}

export async function deleteBusiness(input: unknown) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();
  const { error } = await admin.from('businesses').delete().eq('id', parsed.data.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(admin)/admin/businesses', 'layout');
  return { ok: true as const };
}

export async function upsertCategory(raw: unknown) {
  await requireSuperAdmin();
  const parsed = businessCategoryUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const c = parsed.data;
  const admin = createSupabaseServiceClient();
  const row = { slug: c.slug, name_i18n: c.nameI18n, parent_id: c.parentId };
  if (c.id) {
    const { error } = await admin.from('business_categories').update(row).eq('id', c.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin.from('business_categories').insert(row);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/[locale]/(admin)/admin/categories', 'layout');
  return { ok: true as const };
}

export async function deleteCategory(input: unknown) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();
  const { error } = await admin.from('business_categories').delete().eq('id', parsed.data.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(admin)/admin/categories', 'layout');
  return { ok: true as const };
}

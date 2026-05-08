'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hotelProfileSchema, slugSchema, subscriptionTierSchema, uuidSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';

const createSchema = hotelProfileSchema.extend({
  ownerEmail: z.string().email(),
  subscriptionTier: subscriptionTierSchema.default('standard'),
});

export async function createTenant(raw: unknown) {
  await requireSuperAdmin();
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const p = parsed.data;
  const admin = createSupabaseServiceClient();

  const { data: hotel, error: hotelErr } = await admin
    .from('hotels')
    .insert({
      name: p.name,
      slug: p.slug,
      timezone: p.timezone,
      default_locale: p.defaultLocale,
      lat: p.lat,
      lng: p.lng,
      brand_json: { logoUrl: p.brand.logoUrl ?? null, primaryColor: p.brand.primaryColor ?? null },
      subscription_tier: p.subscriptionTier,
    })
    .select('id, slug')
    .single();
  if (hotelErr || !hotel) return { ok: false as const, error: hotelErr?.message ?? 'insert_failed' };

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    p.ownerEmail,
    {
      data: { aga_role: 'owner', hotel_id: hotel.id },
      redirectTo: `${origin}/auth/callback?next=/owner`,
    },
  );
  if (inviteErr || !invited?.user) {
    return { ok: false as const, error: inviteErr?.message ?? 'invite_failed' };
  }

  const { error: linkErr } = await admin.from('hotel_users').insert({
    hotel_id: hotel.id,
    auth_user_id: invited.user.id,
    role: 'owner',
    email: p.ownerEmail,
  });
  if (linkErr) return { ok: false as const, error: linkErr.message };

  revalidatePath('/[locale]/(admin)/admin', 'layout');
  return { ok: true as const, id: hotel.id, slug: hotel.slug };
}

const updateSchema = hotelProfileSchema.extend({
  id: uuidSchema,
  subscriptionTier: subscriptionTierSchema,
  active: z.boolean(),
});

export async function updateTenant(raw: unknown) {
  await requireSuperAdmin();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const p = parsed.data;
  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from('hotels')
    .update({
      name: p.name,
      slug: p.slug,
      timezone: p.timezone,
      default_locale: p.defaultLocale,
      lat: p.lat,
      lng: p.lng,
      brand_json: { logoUrl: p.brand.logoUrl ?? null, primaryColor: p.brand.primaryColor ?? null },
      subscription_tier: p.subscriptionTier,
      active: p.active,
    })
    .eq('id', p.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(admin)/admin', 'layout');
  return { ok: true as const };
}

const inviteSchema = z.object({
  hotelId: uuidSchema,
  email: z.string().email(),
  role: z.enum(['owner', 'manager', 'staff']),
});

export async function inviteHotelUser(raw: unknown) {
  await requireSuperAdmin();
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const p = parsed.data;
  const admin = createSupabaseServiceClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { data, error } = await admin.auth.admin.inviteUserByEmail(p.email, {
    data: { aga_role: p.role, hotel_id: p.hotelId },
    redirectTo: `${origin}/auth/callback?next=/owner`,
  });
  if (error || !data?.user) return { ok: false as const, error: error?.message ?? 'invite_failed' };

  const { error: linkErr } = await admin
    .from('hotel_users')
    .insert({ hotel_id: p.hotelId, auth_user_id: data.user.id, role: p.role, email: p.email });
  if (linkErr) return { ok: false as const, error: linkErr.message };

  revalidatePath('/[locale]/(admin)/admin', 'layout');
  return { ok: true as const };
}

'use server';

import { revalidatePath } from 'next/cache';
import { hotelProfileSchema, type HotelProfile } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';

export async function updateHotelProfile(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireOwner();
  const parsed = hotelProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  return commit(ctx.hotelId, parsed.data);
}

async function commit(
  hotelId: string,
  p: HotelProfile,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('hotels')
    .update({
      name: p.name,
      slug: p.slug,
      timezone: p.timezone,
      default_locale: p.defaultLocale,
      lat: p.lat,
      lng: p.lng,
      brand_json: {
        logoUrl: p.brand.logoUrl ?? null,
        primaryColor: p.brand.primaryColor ?? null,
      },
    })
    .eq('id', hotelId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/(owner)/owner', 'page');
  return { ok: true };
}

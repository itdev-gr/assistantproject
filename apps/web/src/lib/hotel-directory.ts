import { createSupabaseServiceClient } from '@aga/db/service';
import type { Locale } from '@aga/api-contracts';
import type { DirectoryBusiness } from './public-directory';
import { haversineKm } from './geo';

interface RawRow {
  id: string;
  name: string;
  description_i18n: Record<string, string> | null;
  lat: number;
  lng: number;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  price_band: number | null;
  tags: string[] | null;
  images: unknown;
  category: { slug: string; name_i18n: Record<string, string> } | null;
  partnerships: Array<{
    hotel_id: string;
    active: boolean;
    subscription_tier: 'free' | 'standard' | 'featured' | 'exclusive';
    paid_priority_score: number;
  }>;
}

const TIER_RANK = { free: 0, standard: 1, featured: 2, exclusive: 3 } as const;

export async function listHotelDirectory(
  hotelSlug: string,
  locale: Locale,
): Promise<{
  hotel: { id: string; slug: string; name: string };
  partners: DirectoryBusiness[];
  others: DirectoryBusiness[];
} | null> {
  const supabase = createSupabaseServiceClient();

  const { data: hotel } = await supabase
    .from('public_hotels')
    .select('id, slug, name')
    .eq('slug', hotelSlug)
    .maybeSingle();
  if (!hotel || !hotel.id || !hotel.slug || !hotel.name) return null;

  // Fetch hotel coords for distance computation
  const { data: hotelCoords } = await supabase
    .from('hotels')
    .select('lat, lng')
    .eq('id', hotel.id)
    .maybeSingle();
  const hotelLatLng =
    hotelCoords?.lat != null && hotelCoords?.lng != null
      ? { lat: hotelCoords.lat, lng: hotelCoords.lng }
      : null;

  const { data } = await supabase
    .from('businesses')
    .select(
      `
        id, name, description_i18n, lat, lng, address, phone, whatsapp, website,
        price_band, tags, images,
        category:business_categories ( slug, name_i18n ),
        partnerships ( hotel_id, active, subscription_tier, paid_priority_score )
      `,
    )
    .eq('active', true)
    .eq('verified', true)
    .order('name')
    .returns<RawRow[]>();

  const partners: DirectoryBusiness[] = [];
  const others: DirectoryBusiness[] = [];

  for (const b of data ?? []) {
    const ours =
      (b.partnerships ?? []).find((p) => p.hotel_id === hotel.id && p.active) ?? null;
    const description =
      b.description_i18n?.[locale] ??
      b.description_i18n?.en ??
      b.description_i18n?.el ??
      null;
    const images = Array.isArray(b.images)
      ? (b.images as unknown[]).filter((i): i is string => typeof i === 'string')
      : [];
    const distanceKm = hotelLatLng
      ? haversineKm(hotelLatLng, { lat: b.lat, lng: b.lng })
      : null;
    const card: DirectoryBusiness = {
      id: b.id,
      name: b.name,
      description,
      categorySlug: b.category?.slug ?? 'unknown',
      categoryName:
        b.category?.name_i18n[locale] ??
        b.category?.name_i18n.en ??
        b.category?.slug ??
        'unknown',
      lat: b.lat,
      lng: b.lng,
      address: b.address,
      phone: b.phone,
      whatsapp: b.whatsapp,
      website: b.website,
      priceBand: b.price_band,
      tags: b.tags ?? [],
      images,
      hasPartner: ours !== null,
      topTier: ours?.subscription_tier ?? null,
      distanceKm,
    };
    if (ours) partners.push(card);
    else others.push(card);
  }

  // Sort partners by tier desc, then by distance asc when both have it.
  partners.sort((a, b) => {
    const ta = a.topTier ? TIER_RANK[a.topTier] : -1;
    const tb = b.topTier ? TIER_RANK[b.topTier] : -1;
    if (tb !== ta) return tb - ta;
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });
  others.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  return {
    hotel: { id: hotel.id, slug: hotel.slug, name: hotel.name },
    partners,
    others,
  };
}

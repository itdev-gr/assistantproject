import { createSupabaseServiceClient } from '@aga/db/service';
import type { Locale } from '@aga/api-contracts';

export interface DirectoryBusiness {
  id: string;
  name: string;
  description: string | null;
  categorySlug: string;
  categoryName: string;
  lat: number;
  lng: number;
  address: string;
  phone: string | null;
  website: string | null;
  whatsapp: string | null;
  priceBand: number | null;
  tags: string[];
  images: string[];
  hasPartner: boolean;
  topTier: 'free' | 'standard' | 'featured' | 'exclusive' | null;
}

export interface DirectoryCategory {
  slug: string;
  name: string;
  count: number;
}

interface RawBusinessRow {
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
    active: boolean;
    subscription_tier: 'free' | 'standard' | 'featured' | 'exclusive';
  }>;
}

const TIER_RANK = { free: 0, standard: 1, featured: 2, exclusive: 3 } as const;

export async function listDirectory(locale: Locale): Promise<{
  businesses: DirectoryBusiness[];
  categories: DirectoryCategory[];
}> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('businesses')
    .select(
      `
        id, name, description_i18n, lat, lng, address, phone, whatsapp, website,
        price_band, tags, images,
        category:business_categories ( slug, name_i18n ),
        partnerships ( active, subscription_tier )
      `,
    )
    .eq('active', true)
    .eq('verified', true)
    .order('name')
    .returns<RawBusinessRow[]>();

  const businesses: DirectoryBusiness[] = (data ?? []).map((b) => {
    const description =
      b.description_i18n?.[locale] ??
      b.description_i18n?.en ??
      b.description_i18n?.el ??
      null;
    const activePartnerships = (b.partnerships ?? []).filter((p) => p.active);
    const topTier =
      activePartnerships.length === 0
        ? null
        : activePartnerships.reduce(
            (best, p) =>
              TIER_RANK[p.subscription_tier] > TIER_RANK[best]
                ? p.subscription_tier
                : best,
            activePartnerships[0]!.subscription_tier,
          );
    const images = Array.isArray(b.images) ? (b.images as unknown[]).filter((i): i is string => typeof i === 'string') : [];
    return {
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
      website: b.website,
      whatsapp: b.whatsapp,
      priceBand: b.price_band,
      tags: b.tags ?? [],
      images,
      hasPartner: activePartnerships.length > 0,
      topTier,
    };
  });

  const counts = new Map<string, { name: string; count: number }>();
  for (const b of businesses) {
    const cur = counts.get(b.categorySlug);
    if (cur) cur.count += 1;
    else counts.set(b.categorySlug, { name: b.categoryName, count: 1 });
  }
  const categories: DirectoryCategory[] = [...counts.entries()]
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);

  return { businesses, categories };
}

export async function getBusiness(
  id: string,
  locale: Locale,
): Promise<{
  business: DirectoryBusiness;
  hotelPartners: { slug: string; name: string }[];
} | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('businesses')
    .select(
      `
        id, name, description_i18n, lat, lng, address, phone, whatsapp, website,
        price_band, tags, images,
        category:business_categories ( slug, name_i18n ),
        partnerships ( active, subscription_tier, hotel:hotels ( slug, name ) )
      `,
    )
    .eq('id', id)
    .eq('active', true)
    .eq('verified', true)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as RawBusinessRow & {
    partnerships: Array<{
      active: boolean;
      subscription_tier: 'free' | 'standard' | 'featured' | 'exclusive';
      hotel: { slug: string; name: string } | null;
    }>;
  };

  const description =
    row.description_i18n?.[locale] ??
    row.description_i18n?.en ??
    row.description_i18n?.el ??
    null;
  const activePartnerships = (row.partnerships ?? []).filter((p) => p.active);
  const topTier =
    activePartnerships.length === 0
      ? null
      : activePartnerships.reduce(
          (best, p) =>
            TIER_RANK[p.subscription_tier] > TIER_RANK[best] ? p.subscription_tier : best,
          activePartnerships[0]!.subscription_tier,
        );
  const images = Array.isArray(row.images)
    ? (row.images as unknown[]).filter((i): i is string => typeof i === 'string')
    : [];

  return {
    business: {
      id: row.id,
      name: row.name,
      description,
      categorySlug: row.category?.slug ?? 'unknown',
      categoryName:
        row.category?.name_i18n[locale] ??
        row.category?.name_i18n.en ??
        row.category?.slug ??
        'unknown',
      lat: row.lat,
      lng: row.lng,
      address: row.address,
      phone: row.phone,
      website: row.website,
      whatsapp: row.whatsapp,
      priceBand: row.price_band,
      tags: row.tags ?? [],
      images,
      hasPartner: activePartnerships.length > 0,
      topTier,
    },
    hotelPartners: activePartnerships
      .map((p) => p.hotel)
      .filter((h): h is { slug: string; name: string } => h != null),
  };
}

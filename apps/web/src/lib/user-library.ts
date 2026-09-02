import type { Locale } from '@aga/api-contracts';
import type { DirectoryBusiness } from './public-directory';

/** Embedded business columns for account-area lists (read under RLS). */
export const LIBRARY_BUSINESS_SELECT =
  'id, name, description_i18n, lat, lng, address, phone, whatsapp, website, price_band, tags, images, category:business_categories ( slug, name_i18n )';

export interface LibraryBusinessRow {
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
}

export function rowToDirectoryBusiness(b: LibraryBusinessRow, locale: Locale): DirectoryBusiness {
  const images = Array.isArray(b.images)
    ? (b.images as unknown[]).filter((i): i is string => typeof i === 'string')
    : [];
  return {
    id: b.id,
    name: b.name,
    description:
      b.description_i18n?.[locale] ?? b.description_i18n?.en ?? b.description_i18n?.el ?? null,
    categorySlug: b.category?.slug ?? 'unknown',
    categoryName:
      b.category?.name_i18n[locale] ?? b.category?.name_i18n.en ?? b.category?.slug ?? 'unknown',
    lat: b.lat,
    lng: b.lng,
    address: b.address,
    phone: b.phone,
    website: b.website,
    whatsapp: b.whatsapp,
    priceBand: b.price_band,
    tags: b.tags ?? [],
    images,
    hasPartner: false,
    topTier: null,
  };
}

/** Rows with a hidden/deleted business come back with `business: null`. */
export function pluckBusinesses<T extends { business: LibraryBusinessRow | null }>(
  rows: T[] | null | undefined,
  locale: Locale,
): DirectoryBusiness[] {
  return (rows ?? [])
    .map((r) => r.business)
    .filter((b): b is LibraryBusinessRow => b != null)
    .map((b) => rowToDirectoryBusiness(b, locale));
}

export function toLocale(locale: string): Locale {
  return locale === 'en' ? 'en' : 'el';
}

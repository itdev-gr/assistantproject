export const SUPPORTED_LOCALES = ['el', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'el';

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function detectLocale(text: string): Locale {
  // Greek script range; if any Greek letter present, treat as Greek.
  return /[Ͱ-Ͽἀ-῿]/.test(text) ? 'el' : 'en';
}

export const CURRENCY = 'EUR';

export function formatPriceRange(from: number | null, to: number | null, locale: Locale): string {
  const fmt = new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-GB', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  });
  if (from == null && to == null) return '';
  if (from != null && to != null && from !== to) return `${fmt.format(from)} – ${fmt.format(to)}`;
  return fmt.format((from ?? to) as number);
}

export function formatDistanceKm(km: number, locale: Locale): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return locale === 'el' ? `${meters} μ` : `${meters} m`;
  }
  return locale === 'el' ? `${km.toFixed(1)} χλμ` : `${km.toFixed(1)} km`;
}

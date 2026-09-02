/**
 * Best-effort forward geocoding for self-service business listings.
 *
 * Uses OpenStreetMap's Nominatim (no API key, ~1 req/s fair-use). Failures
 * never block a submission: the caller falls back to a country-level
 * placeholder and tags the row `needs-geocode` so an admin fixes the pin
 * before approving it.
 */

/** Rough geographic centre of Greece — used as a placeholder pin. */
export const GREECE_CENTROID = { lat: 38.5, lng: 23.5 } as const;

export interface GeocodeResult {
  lat: number;
  lng: number;
}

export type GeocodePrecision = 'address' | 'area';

/**
 * Tries the exact address first, then falls back to the town/area so a
 * failed street lookup still lands in the right place instead of the
 * country centroid.
 */
export async function geocodeListing(input: {
  address: string;
  area: string;
}): Promise<(GeocodeResult & { precision: GeocodePrecision }) | null> {
  const exact = await geocodeAddress(`${input.address}, ${input.area}, Greece`);
  if (exact) return { ...exact, precision: 'address' };
  const area = await geocodeAddress(`${input.area}, Greece`);
  if (area) return { ...area, precision: 'area' };
  return null;
}

export async function geocodeAddress(
  query: string,
  opts: { timeoutMs?: number } = {},
): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'gr');

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Roomriv/1.0 (https://www.roomriv.com; listings@roomriv.com)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat?: string; lon?: string }[];
    const first = rows[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

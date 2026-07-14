import { normalize, tokenize } from '@aga/response-engine';

/**
 * Fraction of the guest's query tokens that appear in a business's
 * name + tags + description (all normalized/tokenized the same way the
 * intent matcher does). 0 when the query has no usable tokens, or when
 * none of them are found in the haystack. Always in [0, 1].
 */
export function keywordMatchScore(
  query: string,
  fields: { name: string; tags: string[]; description: string | null },
): number {
  const queryTokens = tokenize(normalize(query));
  if (queryTokens.length === 0) return 0;

  const haystack = [fields.name, ...fields.tags, fields.description ?? ''].join(' ');
  const haystackTokens = new Set(tokenize(normalize(haystack)));
  if (haystackTokens.size === 0) return 0;

  const matched = queryTokens.filter((t) => haystackTokens.has(t)).length;
  return clamp01(matched / queryTokens.length);
}

/**
 * Great-circle distance in kilometres between two lat/lng points, rounded
 * to 1 decimal place for display/ranking purposes.
 */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371; // Earth radius in km
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(s));
  return Math.round(km * 10) / 10;
}

const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = (typeof DAY_ORDER)[number];
const DAY_KEY_SET: ReadonlySet<string> = new Set(DAY_ORDER);

export type OpeningHours = Partial<Record<DayKey, [string, string][]>>;

/**
 * Whether a business is open at `localTime`, given its `opening_hours_json`.
 *
 * Format: { mon: [["09:00","23:00"]], ... } — a day key that is absent, or
 * present with an empty array, means "closed that day". An interval whose
 * close time is earlier than its open time (e.g. ["20:00","02:00"]) spans
 * midnight: it covers open..24:00 on its own day AND 00:00..close on the
 * *next* day, so we also check the previous day's intervals for an
 * overnight tail bleeding into today.
 *
 * Returns null (unknown) when the input isn't a usable opening-hours
 * object at all — never fabricates "open" or "closed" from no data.
 */
export function isOpenNow(openingHoursJson: unknown, localTime: Date): boolean | null {
  if (typeof openingHoursJson !== 'object' || openingHoursJson === null) return null;
  const obj = openingHoursJson as Record<string, unknown>;

  const keys = Object.keys(obj);
  if (keys.length === 0) return null;
  if (!keys.some((k) => DAY_KEY_SET.has(k))) return null;

  const todayIdx = localTime.getDay(); // 0 = Sun ... 6 = Sat
  const todayKey = DAY_ORDER[todayIdx]!;
  const yesterdayKey = DAY_ORDER[(todayIdx + 6) % 7]!;
  const minutesNow = localTime.getHours() * 60 + localTime.getMinutes();

  // Overnight tail from yesterday: an interval like ["20:00","02:00"]
  // yesterday keeps the business open from 00:00 up to "02:00" today.
  for (const interval of intervalsFor(obj, yesterdayKey)) {
    const parsed = parseInterval(interval);
    if (!parsed) continue;
    const [open, close] = parsed;
    if (close < open && minutesNow < close) return true;
  }

  // Today's own intervals, including the same-day portion of an overnight span.
  for (const interval of intervalsFor(obj, todayKey)) {
    const parsed = parseInterval(interval);
    if (!parsed) continue;
    const [open, close] = parsed;
    if (close > open) {
      if (minutesNow >= open && minutesNow < close) return true;
    } else if (close < open) {
      if (minutesNow >= open) return true; // open..24:00 tail
    }
    // close === open: zero-length interval, never matches.
  }

  return false;
}

function intervalsFor(obj: Record<string, unknown>, key: DayKey): unknown[] {
  const v = obj[key];
  return Array.isArray(v) ? v : [];
}

function parseInterval(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const [openStr, closeStr] = raw as unknown[];
  if (typeof openStr !== 'string' || typeof closeStr !== 'string') return null;
  const open = parseTime(openStr);
  const close = parseTime(closeStr);
  if (open === null || close === null) return null;
  return [open, close];
}

function parseTime(s: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

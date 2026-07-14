import { describe, expect, it } from 'vitest';
import { keywordMatchScore, haversineKm, isOpenNow } from './recommendation-signals';

describe('keywordMatchScore', () => {
  it('scores 1.0 when every query token is found', () => {
    const score = keywordMatchScore('fresh fish', {
      name: 'Fresh Fish Taverna',
      tags: [],
      description: null,
    });
    expect(score).toBe(1);
  });

  it('scores the fraction of query tokens found (partial overlap)', () => {
    const score = keywordMatchScore('pizza pasta wine', {
      name: 'La Pasta',
      tags: ['italian', 'pasta'],
      description: 'homemade pasta and pizza',
    });
    // matched: pizza, pasta -> 2/3
    expect(score).toBeCloseTo(2 / 3, 5);
  });

  it('scores 0 when no query tokens are found', () => {
    const score = keywordMatchScore('taxi airport', {
      name: 'La Pasta Italiana',
      tags: ['italian', 'pasta'],
      description: null,
    });
    expect(score).toBe(0);
  });

  it('returns 0 for an empty query', () => {
    const score = keywordMatchScore('', {
      name: 'Fresh Fish Taverna',
      tags: [],
      description: null,
    });
    expect(score).toBe(0);
  });

  it('returns 0 for a query with no recognizable tokens', () => {
    const score = keywordMatchScore('!!! ???', {
      name: 'Fresh Fish Taverna',
      tags: [],
      description: null,
    });
    expect(score).toBe(0);
  });

  it('matches across name + tags + description, joined', () => {
    const score = keywordMatchScore('seafood', {
      name: 'Taverna Apolafsi',
      tags: ['traditional'],
      description: 'fresh seafood every day',
    });
    expect(score).toBe(1);
  });

  it('normalizes Greek accents so matching is accent-insensitive', () => {
    // Query is unaccented; the business name carries accents. Both normalize
    // to the same token, so they should match.
    const score = keywordMatchScore('ψαρι', {
      name: 'Ψάρι Ταβέρνα',
      tags: [],
      description: null,
    });
    expect(score).toBe(1);
  });

  it('is case-insensitive', () => {
    const score = keywordMatchScore('FISH', {
      name: 'fish taverna',
      tags: [],
      description: null,
    });
    expect(score).toBe(1);
  });
});

describe('haversineKm', () => {
  it('returns ~1.0km for points one kilometre apart along a meridian', () => {
    // 1km of latitude change in radians = 1 / earthRadiusKm
    const oneKmInDegrees = (1 / 6371) * (180 / Math.PI);
    const a = { lat: 10, lng: 10 };
    const b = { lat: 10 + oneKmInDegrees, lng: 10 };
    expect(haversineKm(a, b)).toBe(1.0);
  });

  it('returns 0 for identical points', () => {
    const a = { lat: 37.9838, lng: 23.7275 };
    expect(haversineKm(a, { ...a })).toBe(0);
  });

  it('rounds to 1 decimal place', () => {
    const a = { lat: 37.1051, lng: 25.3779 };
    const b = { lat: 37.1042, lng: 25.3768 };
    const km = haversineKm(a, b);
    expect(km).toBe(Math.round(km * 10) / 10);
  });
});

describe('isOpenNow', () => {
  // Mon Jul 13 2026 and Tue Jul 14 2026 (verified consecutive weekdays)
  const mondayNoon = new Date(2026, 6, 13, 12, 0);
  const mondayMorning = new Date(2026, 6, 13, 7, 0);
  const mondayLateNight = new Date(2026, 6, 13, 21, 0);
  const tuesdayEarlyMorning = new Date(2026, 6, 14, 1, 0);
  const tuesdayLateMorning = new Date(2026, 6, 14, 3, 0);

  it('returns true when local time falls inside an open interval', () => {
    const hours = { mon: [['09:00', '23:00']] };
    expect(isOpenNow(hours, mondayNoon)).toBe(true);
  });

  it('returns false when local time falls outside every interval', () => {
    const hours = { mon: [['09:00', '23:00']] };
    expect(isOpenNow(hours, mondayMorning)).toBe(false);
  });

  it('returns false for a day key present with an empty interval list (explicitly closed)', () => {
    const hours = { mon: [], tue: [['09:00', '18:00']] };
    expect(isOpenNow(hours, mondayNoon)).toBe(false);
  });

  it('treats a day key missing from an otherwise-valid schema as closed', () => {
    const hours = { tue: [['09:00', '18:00']] };
    expect(isOpenNow(hours, mondayNoon)).toBe(false);
  });

  it('counts the same-day tail of an overnight interval up to midnight', () => {
    const hours = { mon: [['20:00', '02:00']] };
    expect(isOpenNow(hours, mondayLateNight)).toBe(true);
  });

  it('counts the next-day tail of an overnight interval from the previous day', () => {
    const hours = { mon: [['20:00', '02:00']] };
    expect(isOpenNow(hours, tuesdayEarlyMorning)).toBe(true);
  });

  it('is closed once the overnight interval tail has elapsed the next day', () => {
    const hours = { mon: [['20:00', '02:00']] };
    expect(isOpenNow(hours, tuesdayLateMorning)).toBe(false);
  });

  it('skips invalid time strings but still evaluates other valid intervals', () => {
    const hours = { mon: [['25:99', 'invalid'], ['10:00', '12:00']] };
    expect(isOpenNow(hours, new Date(2026, 6, 13, 11, 0))).toBe(true);
  });

  it('returns false (not null) when the only interval on a recognized day is invalid', () => {
    const hours = { mon: [['25:99', 'invalid']] };
    expect(isOpenNow(hours, mondayNoon)).toBe(false);
  });

  it('returns null for an empty opening-hours object', () => {
    expect(isOpenNow({}, mondayNoon)).toBeNull();
  });

  it('returns null when no keys are recognizable weekdays', () => {
    expect(isOpenNow({ notaday: [['09:00', '18:00']] }, mondayNoon)).toBeNull();
  });

  it('returns null for garbage JSON (string)', () => {
    expect(isOpenNow('closed', mondayNoon)).toBeNull();
  });

  it('returns null for garbage JSON (null)', () => {
    expect(isOpenNow(null, mondayNoon)).toBeNull();
  });

  it('returns null for garbage JSON (number)', () => {
    expect(isOpenNow(42, mondayNoon)).toBeNull();
  });

  it('returns null for garbage JSON (array)', () => {
    expect(isOpenNow([['09:00', '18:00']], mondayNoon)).toBeNull();
  });
});

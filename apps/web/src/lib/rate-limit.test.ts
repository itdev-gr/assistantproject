import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import { RATE_LIMITS, checkAndRecordRateLimit, hashRateKey, isRateLimited } from './rate-limit';

describe('isRateLimited', () => {
  it('allows a session just under its limit', () => {
    expect(isRateLimited({ session: 19, ip: 0 })).toBe(false);
  });

  it('blocks a session at its limit', () => {
    expect(isRateLimited({ session: 20, ip: 0 })).toBe(true);
  });

  it('allows an ip just under its limit', () => {
    expect(isRateLimited({ session: 0, ip: 59 })).toBe(false);
  });

  it('blocks an ip at its limit', () => {
    expect(isRateLimited({ session: 0, ip: 60 })).toBe(true);
  });

  it('blocks when either count is over its limit', () => {
    expect(isRateLimited({ session: 21, ip: 61 })).toBe(true);
  });

  it('matches the RATE_LIMITS constants', () => {
    expect(isRateLimited({ session: RATE_LIMITS.session - 1, ip: RATE_LIMITS.ip - 1 })).toBe(false);
    expect(isRateLimited({ session: RATE_LIMITS.session, ip: 0 })).toBe(true);
    expect(isRateLimited({ session: 0, ip: RATE_LIMITS.ip })).toBe(true);
  });
});

describe('hashRateKey', () => {
  it('is deterministic for the same inputs', () => {
    const a = hashRateKey('session', 'sess_123', 'secret');
    const b = hashRateKey('session', 'sess_123', 'secret');
    expect(a).toBe(b);
  });

  it('prefixes the hash with the kind', () => {
    expect(hashRateKey('session', 'sess_123', 'secret')).toMatch(/^session:[0-9a-f]{64}$/);
    expect(hashRateKey('ip', '1.2.3.4', 'secret')).toMatch(/^ip:[0-9a-f]{64}$/);
  });

  it('differs across kinds for the same value and secret', () => {
    const session = hashRateKey('session', 'same-value', 'secret');
    const ip = hashRateKey('ip', 'same-value', 'secret');
    expect(session).not.toBe(ip);
  });

  it('differs across secrets for the same kind and value', () => {
    const a = hashRateKey('session', 'sess_123', 'secret-a');
    const b = hashRateKey('session', 'sess_123', 'secret-b');
    expect(a).not.toBe(b);
  });

  it('never contains the raw value', () => {
    const hash = hashRateKey('ip', '203.0.113.42', 'secret');
    expect(hash).not.toContain('203.0.113.42');
  });
});

/**
 * Stubs a Supabase client whose `.from()` calls are answered in order:
 * the session count query, the ip count query, then (if not limited) the
 * insert, then the fire-and-forget cleanup delete.
 */
function makeStubAdmin(
  responses: Array<{ count?: number; error?: { message: string } | null }>,
): SupabaseClient<Database> {
  let callIndex = 0;
  const admin = {
    from: vi.fn(() => {
      const resp = responses[callIndex] ?? { error: null };
      callIndex += 1;
      const chain = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        in: () => chain,
        lt: () => chain,
        insert: () => Promise.resolve({ error: resp.error ?? null }),
        delete: () => chain,
        then: (resolve: (v: { count?: number; error: { message: string } | null }) => void) =>
          resolve({ count: resp.count, error: resp.error ?? null }),
      };
      return chain;
    }),
  };
  return admin as unknown as SupabaseClient<Database>;
}

describe('checkAndRecordRateLimit', () => {
  const keys = { session: 'session:abc', ip: 'ip:def' };

  it('records the request and returns not-limited when under both caps', async () => {
    const admin = makeStubAdmin([{ count: 0 }, { count: 0 }, { error: null }, { error: null }]);
    const result = await checkAndRecordRateLimit(admin, keys);
    expect(result).toEqual({ limited: false });
  });

  it('returns limited without inserting when the session count is at its cap', async () => {
    const admin = makeStubAdmin([{ count: RATE_LIMITS.session }, { count: 0 }]);
    const result = await checkAndRecordRateLimit(admin, keys);
    expect(result).toEqual({ limited: true });
    // Only the two count queries should have run — no insert.
    expect(admin.from).toHaveBeenCalledTimes(2);
  });

  it('fails open when a count query errors', async () => {
    const admin = makeStubAdmin([{ count: 0, error: { message: 'connection reset' } }, { count: 0 }]);
    const result = await checkAndRecordRateLimit(admin, keys);
    expect(result).toEqual({ limited: false });
  });
});

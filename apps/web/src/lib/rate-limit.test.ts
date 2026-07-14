import { describe, expect, it } from 'vitest';
import { RATE_LIMITS, hashRateKey, isRateLimited } from './rate-limit';

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

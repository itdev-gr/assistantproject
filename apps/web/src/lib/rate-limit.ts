import { createHmac } from 'node:crypto';

/**
 * Guest chat rate limits: per-session and per-ip request caps within a
 * rolling window. The chat route is responsible for counting requests in
 * `windowMinutes` and calling `isRateLimited`; this module only holds the
 * pure decision + the key-hashing helper so raw session ids / ips never sit
 * in the `rate_limit_events` table unhashed.
 */
export const RATE_LIMITS = { session: 20, ip: 60, windowMinutes: 10 } as const;

export function isRateLimited(counts: { session: number; ip: number }): boolean {
  return counts.session >= RATE_LIMITS.session || counts.ip >= RATE_LIMITS.ip;
}

export function hashRateKey(kind: 'session' | 'ip', value: string, secret: string): string {
  const hash = createHmac('sha256', secret).update(value).digest('hex');
  return `${kind}:${hash}`;
}

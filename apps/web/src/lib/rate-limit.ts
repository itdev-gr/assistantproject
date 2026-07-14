import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';

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

/**
 * DB-backed half of rate limiting: counts recent `rate_limit_events` rows for
 * the (already-hashed) session and ip keys, applies `isRateLimited`, and — if
 * not limited — records the current request and prunes old rows for those
 * keys. Any Supabase error fails open (`{ limited: false }`): availability
 * for guests matters more than perfect enforcement of the cap.
 */
export async function checkAndRecordRateLimit(
  admin: SupabaseClient<Database>,
  keys: { session?: string; ip: string },
): Promise<{ limited: boolean }> {
  const windowStart = new Date(Date.now() - RATE_LIMITS.windowMinutes * 60_000).toISOString();

  try {
    let sessionResult: { count: number | null; error: { message: string } | null } | undefined;
    let ipResult: { count: number | null; error: { message: string } | null };

    if (keys.session) {
      [sessionResult, ipResult] = await Promise.all([
        admin
          .from('rate_limit_events')
          .select('*', { count: 'exact', head: true })
          .eq('key', keys.session)
          .gt('created_at', windowStart),
        admin
          .from('rate_limit_events')
          .select('*', { count: 'exact', head: true })
          .eq('key', keys.ip)
          .gt('created_at', windowStart),
      ]);
    } else {
      ipResult = await admin
        .from('rate_limit_events')
        .select('*', { count: 'exact', head: true })
        .eq('key', keys.ip)
        .gt('created_at', windowStart);
    }

    if ((sessionResult && sessionResult.error) || ipResult.error) {
      console.error(
        'rate limit count failed:',
        (sessionResult?.error ?? ipResult.error)?.message,
      );
      return { limited: false };
    }

    if (isRateLimited({ session: sessionResult?.count ?? 0, ip: ipResult.count ?? 0 })) {
      return { limited: true };
    }

    const insertKeys = [];
    if (keys.session) insertKeys.push({ key: keys.session });
    insertKeys.push({ key: keys.ip });

    const { error: insertErr } = await admin
      .from('rate_limit_events')
      .insert(insertKeys);
    if (insertErr) {
      console.error('rate limit record failed:', insertErr.message);
      return { limited: false };
    }

    // Fire-and-forget: prune rows older than 2 windows for these keys.
    const cleanupBefore = new Date(
      Date.now() - 2 * RATE_LIMITS.windowMinutes * 60_000,
    ).toISOString();
    const cleanupKeys = [];
    if (keys.session) cleanupKeys.push(keys.session);
    cleanupKeys.push(keys.ip);

    void admin
      .from('rate_limit_events')
      .delete()
      .in('key', cleanupKeys)
      .lt('created_at', cleanupBefore)
      .then(({ error }) => {
        if (error) console.error('rate limit cleanup failed:', error.message);
      });

    return { limited: false };
  } catch (err) {
    console.error('rate limit check failed:', err instanceof Error ? err.message : 'unknown error');
    return { limited: false };
  }
}

import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@aga/db/service';
import { getStripe } from '@/lib/stripe';
import { runBillingReconciliation } from '@/lib/billing-reconcile-runner';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Nightly Stripe ↔ DB billing audit (see apps/web/vercel.json). Heals the
 * safe class of discrepancies and records the run for /admin/billing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const outcome = await runBillingReconciliation(createSupabaseServiceClient(), getStripe());
    return NextResponse.json({
      runId: outcome.runId,
      ok: outcome.ok,
      found: outcome.found.length,
      healed: outcome.healed,
      remaining: outcome.remaining.length,
      summary: outcome.summary,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown_error' }, { status: 500 });
  }
}

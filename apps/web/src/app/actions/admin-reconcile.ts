'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { getStripe } from '@/lib/stripe';
import { applyFix, runBillingReconciliation } from '@/lib/billing-reconcile-runner';

const fixSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sync_business'), businessId: z.string().uuid() }),
  z.object({ action: z.literal('sync_hotel'), hotelId: z.string().uuid() }),
  z.object({ action: z.literal('replay_event'), eventId: z.string().min(1).max(120) }),
  z.object({ action: z.literal('ingest_event'), eventId: z.string().min(1).max(120) }),
  z.object({ action: z.literal('mark_commission_paid'), commissionEventId: z.string().uuid() }),
]);

/** "Run now" on /admin/billing. */
export async function runReconciliationNow(raw?: unknown) {
  await requireSuperAdmin();
  const heal = typeof raw === 'object' && raw !== null && (raw as { heal?: boolean }).heal === false ? false : true;
  try {
    const outcome = await runBillingReconciliation(createSupabaseServiceClient(), getStripe(), { heal });
    revalidatePath('/[locale]/(admin)/admin', 'layout');
    return {
      ok: true as const,
      found: outcome.found.length,
      healed: outcome.healed,
      remaining: outcome.remaining.length,
      clean: outcome.ok,
    };
  } catch (err) {
    console.error('runReconciliationNow failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'reconcile_failed' };
  }
}

/** Applies a single fix from the issues table. */
export async function applyReconcileFix(raw: unknown) {
  await requireSuperAdmin();
  const parsed = fixSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  try {
    await applyFix(createSupabaseServiceClient(), getStripe(), parsed.data);
    revalidatePath('/[locale]/(admin)/admin', 'layout');
    return { ok: true as const };
  } catch (err) {
    console.error('applyReconcileFix failed', parsed.data, err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'fix_failed' };
  }
}

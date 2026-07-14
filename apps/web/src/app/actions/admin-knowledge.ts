'use server';

import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { reindexAllHotels, reindexHotelKnowledge, type ReindexOutcome } from '@/lib/knowledge-indexer';

const reindexArgSchema = z.string().uuid().optional();

export async function reindexKnowledge(hotelId?: string) {
  await requireSuperAdmin();
  const parsed = reindexArgSchema.safeParse(hotelId);
  if (!parsed.success) return { ok: false as const, error: 'invalid_hotel_id' };
  try {
    const admin = createSupabaseServiceClient();
    const results: ReindexOutcome[] = parsed.data
      ? [await reindexHotelKnowledge(admin, parsed.data)]
      : await reindexAllHotels(admin);
    return { ok: true as const, results };
  } catch (err) {
    console.error('reindexKnowledge failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'reindex_failed' };
  }
}

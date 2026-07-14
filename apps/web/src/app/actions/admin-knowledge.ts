'use server';

import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { reindexAllHotels } from '@/lib/knowledge-indexer';

export async function reindexKnowledge() {
  await requireSuperAdmin();
  try {
    const results = await reindexAllHotels(createSupabaseServiceClient());
    return { ok: true as const, results };
  } catch (err) {
    console.error('reindexKnowledge failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'reindex_failed' };
  }
}

import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@aga/db/service';
import { reindexAllHotels } from '@/lib/knowledge-indexer';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const results = await reindexAllHotels(createSupabaseServiceClient());
    return NextResponse.json({ reindexed: results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown_error' }, { status: 500 });
  }
}

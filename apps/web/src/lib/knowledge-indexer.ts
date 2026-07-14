import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import {
  buildKnowledgeDocs,
  contentHash,
  type AmenityRow,
  type BusinessRow,
  type EventRow,
  type FaqRow,
  type HotelKnowledgeInput,
  type HotelRow,
  type HoursRow,
  type KnowledgeDoc,
  type PolicyRow,
} from './knowledge-docs';
import { embedTexts } from './openai';

type DB = SupabaseClient<Database>;

export interface ReindexResult {
  hotelId: string;
  upserted: number;
  deleted: number;
  skipped: number;
}

export type ReindexOutcome = ReindexResult | { hotelId: string; error: string };

interface RawOfferingRow {
  title: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  duration_minutes: number | null;
  active: boolean;
}

interface RawPartnershipRow {
  subscription_tier: Database['public']['Enums']['subscription_tier'];
  business: {
    id: string;
    name: string;
    description_i18n: Record<string, string> | null;
    address: string;
    phone: string | null;
    whatsapp: string | null;
    price_band: number | null;
    tags: string[] | null;
    opening_hours_json: Record<string, unknown> | null;
    category: { name_i18n: Record<string, string> } | null;
    offerings: RawOfferingRow[] | null;
  };
}

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/**
 * Pulls every published/active knowledge-bearing row for a hotel and maps it
 * into Task 2's HotelKnowledgeInput shape. Read-only; all rows come from a
 * service-role client so RLS never filters this out from under us.
 */
async function fetchKnowledgeInput(admin: DB, hotelId: string): Promise<HotelKnowledgeInput> {
  const [
    { data: hotel, error: hotelErr },
    { data: hoursRows, error: hoursErr },
    { data: faqRows, error: faqErr },
    { data: policyRows, error: policyErr },
    { data: amenityRows, error: amenityErr },
    { data: eventRows, error: eventErr },
    { data: partnershipRows, error: partnershipErr },
  ] = await Promise.all([
    admin.from('hotels').select('id, name, timezone, active').eq('id', hotelId).maybeSingle(),
    admin.from('hours').select('entity_type, weekday, opens, closes').eq('hotel_id', hotelId),
    admin
      .from('faqs')
      .select('id, locale, question, answer, tags')
      .eq('hotel_id', hotelId)
      .eq('state', 'published'),
    admin
      .from('policies')
      .select('id, kind, locale, body')
      .eq('hotel_id', hotelId)
      .eq('state', 'published'),
    admin
      .from('amenities')
      .select('id, name, description, location_on_property, hours_json')
      .eq('hotel_id', hotelId)
      .eq('state', 'published'),
    admin
      .from('events_internal')
      .select('id, title, description, starts_at, ends_at')
      .eq('hotel_id', hotelId)
      .eq('state', 'published'),
    admin
      .from('partnerships')
      .select(
        `
          subscription_tier,
          business:businesses!inner (
            id, name, description_i18n, address, phone, whatsapp, price_band, tags, opening_hours_json,
            category:business_categories ( name_i18n ),
            offerings:business_offerings ( title, description, price_from, price_to, duration_minutes, active )
          )
        `,
      )
      .eq('hotel_id', hotelId)
      .eq('active', true)
      .eq('businesses.active', true)
      .eq('businesses.verified', true)
      .returns<RawPartnershipRow[]>(),
  ]);

  assertNoError(hotelErr, 'Failed to fetch hotel');
  if (!hotel) throw new Error(`Hotel not found: ${hotelId}`);
  assertNoError(hoursErr, 'Failed to fetch hours');
  assertNoError(faqErr, 'Failed to fetch faqs');
  assertNoError(policyErr, 'Failed to fetch policies');
  assertNoError(amenityErr, 'Failed to fetch amenities');
  assertNoError(eventErr, 'Failed to fetch events');
  assertNoError(partnershipErr, 'Failed to fetch partnerships');

  const hotelRow: HotelRow = { id: hotel.id, name: hotel.name, timezone: hotel.timezone };

  const hours: HoursRow[] = (hoursRows ?? []).map((h) => ({
    entityType: h.entity_type,
    weekday: h.weekday,
    opens: h.opens,
    closes: h.closes,
  }));

  const faqs: FaqRow[] = (faqRows ?? []).map((f) => ({
    id: f.id,
    locale: f.locale as 'el' | 'en',
    question: f.question,
    answer: f.answer,
    tags: f.tags ?? [],
  }));

  const policies: PolicyRow[] = (policyRows ?? []).map((p) => ({
    id: p.id,
    kind: p.kind,
    locale: p.locale as 'el' | 'en',
    body: p.body,
  }));

  const amenities: AmenityRow[] = (amenityRows ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    locationOnProperty: a.location_on_property,
    hoursJson: a.hours_json as Record<string, unknown> | null,
  }));

  const events: EventRow[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
  }));

  const businesses: BusinessRow[] = (partnershipRows ?? []).map((row) => {
    const b = row.business;
    const nameEn = b.category?.name_i18n?.en ?? '';
    const nameEl = b.category?.name_i18n?.el ?? '';
    return {
      id: b.id,
      name: b.name,
      categoryName: `${nameEn} / ${nameEl}`,
      descriptionI18n: b.description_i18n,
      address: b.address,
      phone: b.phone,
      whatsapp: b.whatsapp,
      priceBand: b.price_band,
      tags: b.tags ?? [],
      openingHoursJson: b.opening_hours_json,
      tier: row.subscription_tier,
      offerings: (b.offerings ?? [])
        .filter((o) => o.active)
        .map((o) => ({
          title: o.title,
          description: o.description,
          priceFrom: o.price_from,
          priceTo: o.price_to,
          durationMinutes: o.duration_minutes,
        })),
    };
  });

  return { hotel: hotelRow, hoursRows: hours, faqs, policies, amenities, events, businesses };
}

/** Diffs freshly built docs against the stored `knowledge_chunks`, embeds only what changed. */
export async function reindexHotelKnowledge(admin: DB, hotelId: string): Promise<ReindexResult> {
  const input = await fetchKnowledgeInput(admin, hotelId);
  const docs = buildKnowledgeDocs(input);

  const { data: existingRows, error: existingErr } = await admin
    .from('knowledge_chunks')
    .select('id, locale, source_table, source_id, content_hash')
    .eq('hotel_id', hotelId);
  assertNoError(existingErr, 'Failed to fetch existing knowledge chunks');

  const existingByKey = new Map(
    (existingRows ?? []).map((row) => [chunkKey(row.locale, row.source_table, row.source_id), row]),
  );

  const changed: { doc: KnowledgeDoc; hash: string }[] = [];
  const seenKeys = new Set<string>();
  let skipped = 0;

  for (const doc of docs) {
    const key = chunkKey(doc.locale, doc.sourceTable, doc.sourceId);
    seenKeys.add(key);
    const hash = contentHash(doc);
    const existing = existingByKey.get(key);
    if (!existing || existing.content_hash !== hash) {
      changed.push({ doc, hash });
    } else {
      skipped += 1;
    }
  }

  const staleIds = (existingRows ?? [])
    .filter((row) => !seenKeys.has(chunkKey(row.locale, row.source_table, row.source_id)))
    .map((row) => row.id);

  let upserted = 0;
  if (changed.length > 0) {
    const vectors = await embedTexts(changed.map(({ doc }) => `${doc.title}\n${doc.content}`));
    const rows = changed.map(({ doc, hash }, i) => ({
      hotel_id: hotelId,
      locale: doc.locale,
      source_table: doc.sourceTable,
      source_id: doc.sourceId,
      title: doc.title,
      content: doc.content,
      content_hash: hash,
      embedding: JSON.stringify(vectors[i]),
      updated_at: new Date().toISOString(),
    }));
    const { error: upsertErr } = await admin
      .from('knowledge_chunks')
      .upsert(rows, { onConflict: 'hotel_id,locale,source_table,source_id' });
    assertNoError(upsertErr, 'Failed to upsert knowledge chunks');
    upserted = rows.length;
  }

  let deleted = 0;
  if (staleIds.length > 0) {
    const { error: deleteErr } = await admin.from('knowledge_chunks').delete().in('id', staleIds);
    assertNoError(deleteErr, 'Failed to delete stale knowledge chunks');
    deleted = staleIds.length;
  }

  return { hotelId, upserted, deleted, skipped };
}

/** Reindexes every active hotel, sequentially (keeps embedding-API load predictable). */
export async function reindexAllHotels(admin: DB): Promise<ReindexOutcome[]> {
  const { data: hotels, error } = await admin.from('hotels').select('id').eq('active', true);
  assertNoError(error, 'Failed to fetch active hotels');

  const results: ReindexOutcome[] = [];
  for (const hotel of hotels ?? []) {
    try {
      results.push(await reindexHotelKnowledge(admin, hotel.id));
    } catch (err) {
      console.error('reindex failed for hotel', hotel.id, err instanceof Error ? err.message : err);
      results.push({ hotelId: hotel.id, error: err instanceof Error ? err.message : 'unknown' });
    }
  }
  return results;
}

function chunkKey(locale: string, sourceTable: string, sourceId: string): string {
  return `${locale}|${sourceTable}|${sourceId}`;
}

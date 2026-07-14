import { createHash } from 'node:crypto';

/**
 * Turns raw hotel content rows into embeddable knowledge documents. Pure and
 * synchronous: the caller fetches rows from Supabase and hands them in as
 * plain data, and a later step embeds `buildKnowledgeDocs` output and writes
 * it (keyed by `contentHash`) into the `knowledge_chunks` table. Keeping this
 * free of I/O keeps the doc-shaping rules unit-testable without a database.
 */

export interface KnowledgeDoc {
  locale: 'el' | 'en';
  sourceTable: string; // 'hotels' | 'faqs' | 'policies' | 'amenities' | 'events_internal' | 'businesses'
  sourceId: string;
  title: string;
  content: string;
}

export function contentHash(doc: KnowledgeDoc): string {
  const material = `${doc.locale}|${doc.sourceTable}|${doc.sourceId}|${doc.title}|${doc.content}`;
  return createHash('sha256').update(material).digest('hex');
}

export type HoursEntityType =
  | 'reception'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'pool'
  | 'bar'
  | 'spa'
  | 'gym'
  | 'checkin'
  | 'checkout'
  | 'amenity';

export interface HotelRow {
  id: string;
  name: string;
  timezone: string;
}

export interface HoursRow {
  entityType: HoursEntityType;
  weekday: number; // 0 = Sunday .. 6 = Saturday, matches Date#getDay()
  opens: string; // "HH:MM" or "HH:MM:SS"
  closes: string;
}

export interface FaqRow {
  id: string;
  locale: 'el' | 'en';
  question: string;
  answer: string;
  tags: string[];
}

export interface PolicyRow {
  id: string;
  kind: string;
  locale: 'el' | 'en';
  body: string;
}

export interface AmenityRow {
  id: string;
  name: string;
  description: string | null;
  locationOnProperty: string | null;
  hoursJson: Record<string, unknown> | null;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
}

export interface OfferingRow {
  title: string;
  description: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  durationMinutes: number | null;
}

export interface BusinessRow {
  id: string;
  name: string;
  categoryName: string;
  descriptionI18n: Record<string, string> | null;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  priceBand: number | null;
  tags: string[];
  openingHoursJson: Record<string, unknown> | null;
  tier: 'free' | 'standard' | 'featured' | 'exclusive';
  offerings: OfferingRow[];
}

export interface HotelKnowledgeInput {
  hotel: HotelRow;
  hoursRows: HoursRow[];
  faqs: FaqRow[];
  policies: PolicyRow[];
  amenities: AmenityRow[];
  events: EventRow[];
  businesses: BusinessRow[];
}

const LOCALES: ('el' | 'en')[] = ['el', 'en'];

const WEEKDAY_LABELS: Record<'el' | 'en', string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  el: ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'],
};

const ENTITY_LABELS: Record<'el' | 'en', Record<HoursEntityType, string>> = {
  en: {
    checkin: 'Check-in',
    checkout: 'Check-out',
    breakfast: 'Breakfast',
    reception: 'Reception',
    pool: 'Pool',
    bar: 'Bar',
    spa: 'Spa',
    gym: 'Gym',
    lunch: 'Lunch',
    dinner: 'Dinner',
    amenity: 'Amenity',
  },
  el: {
    checkin: 'Άφιξη (check-in)',
    checkout: 'Αναχώρηση (check-out)',
    breakfast: 'Πρωινό',
    reception: 'Ρεσεψιόν',
    pool: 'Πισίνα',
    bar: 'Μπαρ',
    spa: 'Σπα',
    gym: 'Γυμναστήριο',
    lunch: 'Μεσημεριανό',
    dinner: 'Βραδινό',
    amenity: 'Παροχή',
  },
};

function toHHMM(time: string): string {
  const match = /^(\d{2}:\d{2})/.exec(time);
  return match?.[1] ?? time;
}

function isNonEmptyObject(value: Record<string, unknown> | null | undefined): value is Record<string, unknown> {
  return !!value && Object.keys(value).length > 0;
}

function otherLocale(locale: 'el' | 'en'): 'el' | 'en' {
  return locale === 'el' ? 'en' : 'el';
}

function localizedValue(i18n: Record<string, string> | null | undefined, locale: 'el' | 'en'): string {
  if (!i18n) return '';
  return i18n[locale] ?? i18n[otherLocale(locale)] ?? '';
}

function makeDoc(locale: 'el' | 'en', sourceTable: string, sourceId: string, title: string, contentLines: string[]): KnowledgeDoc | null {
  const content = contentLines.filter((line) => line.trim().length > 0).join('\n').trim();
  if (!content) return null;
  return { locale, sourceTable, sourceId, title: title.trim(), content };
}

function buildHotelDocs(hotel: HotelRow, hoursRows: HoursRow[]): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  for (const locale of LOCALES) {
    const title = locale === 'en' ? `Hotel — ${hotel.name}` : `Ξενοδοχείο — ${hotel.name}`;
    const lines = [`Timezone: ${hotel.timezone}`];
    for (const row of hoursRows) {
      const weekday = WEEKDAY_LABELS[locale][row.weekday];
      const entity = ENTITY_LABELS[locale][row.entityType];
      lines.push(`${weekday} — ${entity}: ${toHHMM(row.opens)}–${toHHMM(row.closes)}`);
    }
    const doc = makeDoc(locale, 'hotels', hotel.id, title, lines);
    if (doc) docs.push(doc);
  }
  return docs;
}

function buildFaqDocs(faqs: FaqRow[]): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  for (const faq of faqs) {
    const lines = [faq.answer];
    if (faq.tags.length > 0) lines.push(`Tags: ${faq.tags.join(', ')}`);
    const doc = makeDoc(faq.locale, 'faqs', faq.id, faq.question, lines);
    if (doc) docs.push(doc);
  }
  return docs;
}

function buildPolicyDocs(policies: PolicyRow[]): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  for (const policy of policies) {
    const title = policy.locale === 'en' ? `Policy — ${policy.kind}` : `Πολιτική — ${policy.kind}`;
    const doc = makeDoc(policy.locale, 'policies', policy.id, title, [policy.body]);
    if (doc) docs.push(doc);
  }
  return docs;
}

function buildAmenityDocs(amenities: AmenityRow[]): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  for (const amenity of amenities) {
    for (const locale of LOCALES) {
      const title = locale === 'en' ? `Amenity — ${amenity.name}` : `Παροχή — ${amenity.name}`;
      const lines = [amenity.description ?? ''];
      if (amenity.locationOnProperty) lines.push(`Location: ${amenity.locationOnProperty}`);
      if (isNonEmptyObject(amenity.hoursJson)) lines.push(`Hours: ${JSON.stringify(amenity.hoursJson)}`);
      const doc = makeDoc(locale, 'amenities', amenity.id, title, lines);
      if (doc) docs.push(doc);
    }
  }
  return docs;
}

function buildEventDocs(events: EventRow[]): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  for (const event of events) {
    for (const locale of LOCALES) {
      const lines = [event.description ?? '', `Starts: ${event.startsAt}`];
      if (event.endsAt) lines.push(`Ends: ${event.endsAt}`);
      const doc = makeDoc(locale, 'events_internal', event.id, event.title, lines);
      if (doc) docs.push(doc);
    }
  }
  return docs;
}

function formatOffering(offering: OfferingRow): string {
  let line = `Offering: ${offering.title}`;
  if (offering.description) line += ` — ${offering.description}`;

  const priceFragment =
    offering.priceFrom != null && offering.priceTo != null
      ? `${offering.priceFrom}–${offering.priceTo} EUR`
      : offering.priceFrom != null
        ? `from ${offering.priceFrom} EUR`
        : offering.priceTo != null
          ? `up to ${offering.priceTo} EUR`
          : null;
  const fragments = [priceFragment, offering.durationMinutes != null ? `${offering.durationMinutes} min` : null].filter(
    (f): f is string => f != null,
  );
  if (fragments.length > 0) line += ` (${fragments.join(', ')})`;
  return line;
}

function buildBusinessDocs(businesses: BusinessRow[]): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  for (const business of businesses) {
    for (const locale of LOCALES) {
      const title = `${business.name} — ${business.categoryName}`;
      const lines = [localizedValue(business.descriptionI18n, locale), `Address: ${business.address}`];
      if (business.phone) lines.push(`Phone: ${business.phone}`);
      if (business.whatsapp) lines.push(`WhatsApp: ${business.whatsapp}`);
      if (business.priceBand != null) lines.push(`Price: ${'€'.repeat(business.priceBand)}`);
      if (business.tags.length > 0) lines.push(`Tags: ${business.tags.join(', ')}`);
      if (isNonEmptyObject(business.openingHoursJson)) lines.push(`Opening hours: ${JSON.stringify(business.openingHoursJson)}`);
      if (business.tier === 'featured' || business.tier === 'exclusive') lines.push(`Partner tier: ${business.tier}`);
      for (const offering of business.offerings) lines.push(formatOffering(offering));
      const doc = makeDoc(locale, 'businesses', business.id, title, lines);
      if (doc) docs.push(doc);
    }
  }
  return docs;
}

export function buildKnowledgeDocs(input: HotelKnowledgeInput): KnowledgeDoc[] {
  return [
    ...buildHotelDocs(input.hotel, input.hoursRows),
    ...buildFaqDocs(input.faqs),
    ...buildPolicyDocs(input.policies),
    ...buildAmenityDocs(input.amenities),
    ...buildEventDocs(input.events),
    ...buildBusinessDocs(input.businesses),
  ];
}

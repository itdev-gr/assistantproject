import { describe, expect, it } from 'vitest';
import { buildKnowledgeDocs, contentHash, type HotelKnowledgeInput, type KnowledgeDoc } from './knowledge-docs';

const emptyInput: HotelKnowledgeInput = {
  hotel: { id: 'h-1', name: 'Aegean Blue', timezone: 'Europe/Athens' },
  hoursRows: [],
  faqs: [],
  policies: [],
  amenities: [],
  events: [],
  businesses: [],
};

describe('buildKnowledgeDocs — hotel + hours', () => {
  const input: HotelKnowledgeInput = {
    ...emptyInput,
    hoursRows: [
      { entityType: 'checkin', weekday: 1, opens: '14:00:00', closes: '22:00:00' },
      { entityType: 'breakfast', weekday: 1, opens: '07:00:00', closes: '10:30:00' },
    ],
  };

  it('emits one hotel doc per locale with translated title', () => {
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'hotels');
    expect(docs).toHaveLength(2);
    const en = docs.find((d) => d.locale === 'en')!;
    const el = docs.find((d) => d.locale === 'el')!;
    expect(en.title).toBe('Hotel — Aegean Blue');
    expect(el.title).toBe('Ξενοδοχείο — Aegean Blue');
    expect(en.sourceId).toBe('h-1');
    expect(el.sourceId).toBe('h-1');
  });

  it('includes the timezone and bilingual hours labels/weekday names', () => {
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'hotels');
    const en = docs.find((d) => d.locale === 'en')!;
    const el = docs.find((d) => d.locale === 'el')!;

    expect(en.content).toContain('Europe/Athens');
    expect(en.content).toContain('Monday');
    expect(en.content).toContain('Check-in');
    expect(en.content).toContain('Breakfast');
    expect(en.content).toContain('14:00–22:00');
    expect(en.content).toContain('07:00–10:30');

    expect(el.content).toContain('Europe/Athens');
    expect(el.content).toContain('Δευτέρα');
    expect(el.content).toContain('Άφιξη (check-in)');
    expect(el.content).toContain('Πρωινό');
    expect(el.content).toContain('14:00–22:00');
  });
});

describe('buildKnowledgeDocs — faqs', () => {
  it('emits an FAQ doc only in its own locale', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      faqs: [
        { id: 'f-1', locale: 'en', question: 'Is breakfast included?', answer: 'Yes, 7am to 10:30am.', tags: [] },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'faqs');
    expect(docs).toHaveLength(1);
    expect(docs[0]!.locale).toBe('en');
    expect(docs[0]!.title).toBe('Is breakfast included?');
    expect(docs[0]!.content).toContain('Yes, 7am to 10:30am.');
  });

  it('appends a Tags line only when tags are non-empty', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      faqs: [
        { id: 'f-1', locale: 'en', question: 'Pets allowed?', answer: 'No pets.', tags: ['pets', 'policy'] },
        { id: 'f-2', locale: 'en', question: 'Wifi password?', answer: 'Ask reception.', tags: [] },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'faqs');
    const withTags = docs.find((d) => d.sourceId === 'f-1')!;
    const withoutTags = docs.find((d) => d.sourceId === 'f-2')!;
    expect(withTags.content).toContain('Tags: pets, policy');
    expect(withoutTags.content).not.toContain('Tags:');
  });
});

describe('buildKnowledgeDocs — policies', () => {
  it('emits a policy doc only in its own locale with translated title prefix', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      policies: [
        { id: 'p-1', kind: 'cancellation', locale: 'en', body: 'Free cancellation up to 48h before arrival.' },
        { id: 'p-2', kind: 'cancellation', locale: 'el', body: 'Δωρεάν ακύρωση έως 48 ώρες πριν την άφιξη.' },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'policies');
    expect(docs).toHaveLength(2);
    const en = docs.find((d) => d.sourceId === 'p-1')!;
    const el = docs.find((d) => d.sourceId === 'p-2')!;
    expect(en.locale).toBe('en');
    expect(en.title).toBe('Policy — cancellation');
    expect(en.content).toBe('Free cancellation up to 48h before arrival.');
    expect(el.locale).toBe('el');
    expect(el.title).toBe('Πολιτική — cancellation');
  });
});

describe('buildKnowledgeDocs — amenities', () => {
  it('emits an amenity doc in both locales with location and flattened hours', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      amenities: [
        {
          id: 'a-1',
          name: 'Rooftop Pool',
          description: 'Heated infinity pool with sea views.',
          locationOnProperty: 'Level 6',
          hoursJson: { mon: '08:00-20:00' },
        },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'amenities');
    expect(docs).toHaveLength(2);
    const en = docs.find((d) => d.locale === 'en')!;
    const el = docs.find((d) => d.locale === 'el')!;
    expect(en.title).toBe('Amenity — Rooftop Pool');
    expect(el.title).toBe('Παροχή — Rooftop Pool');
    expect(en.content).toContain('Heated infinity pool with sea views.');
    expect(en.content).toContain('Location: Level 6');
    expect(en.content).toContain('08:00-20:00');
  });

  it('omits the location line and hours JSON when absent', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      amenities: [
        { id: 'a-2', name: 'Gym', description: 'Small fitness room.', locationOnProperty: null, hoursJson: {} },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'amenities');
    const en = docs.find((d) => d.locale === 'en')!;
    expect(en.content).not.toContain('Location:');
    expect(en.content).not.toContain('{}');
  });
});

describe('buildKnowledgeDocs — internal events', () => {
  it('emits an event doc in both locales with start time', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      events: [
        {
          id: 'e-1',
          title: 'Live Sunset Jazz',
          description: 'Live music on the terrace.',
          startsAt: '2026-07-20T19:00:00.000Z',
          endsAt: '2026-07-20T21:00:00.000Z',
        },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'events_internal');
    expect(docs).toHaveLength(2);
    for (const doc of docs) {
      expect(doc.title).toBe('Live Sunset Jazz');
      expect(doc.content).toContain('Live music on the terrace.');
      expect(doc.content).toContain('Starts: 2026-07-20T19:00:00.000Z');
      expect(doc.content).toContain('Ends: 2026-07-20T21:00:00.000Z');
    }
  });

  it('omits the Ends line when endsAt is absent', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      events: [
        { id: 'e-2', title: 'Morning Yoga', description: null, startsAt: '2026-07-21T07:00:00.000Z', endsAt: null },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'events_internal');
    expect(docs[0]!.content).not.toContain('Ends:');
    expect(docs[0]!.content).toContain('Starts: 2026-07-21T07:00:00.000Z');
  });
});

describe('buildKnowledgeDocs — businesses', () => {
  const input: HotelKnowledgeInput = {
    ...emptyInput,
    businesses: [
      {
        id: 'b-1',
        name: 'Blue Lagoon Spa',
        categoryName: 'Spa',
        descriptionI18n: { el: 'Χαλαρωτικό σπα με θέα στη θάλασσα.' },
        address: '12 Harbor Road',
        phone: '+30 210 1234567',
        whatsapp: '+30 690 1234567',
        priceBand: 3,
        tags: ['relax', 'massage'],
        openingHoursJson: { mon: '09:00-18:00' },
        tier: 'exclusive',
        offerings: [
          { title: 'Couples Massage', description: 'Side-by-side massage', priceFrom: 80, priceTo: 120, durationMinutes: 60 },
          { title: 'Quick Facial', description: null, priceFrom: 40, priceTo: null, durationMinutes: null },
        ],
      },
    ],
  };

  it('emits a business doc per locale with the localized name/category title', () => {
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'businesses');
    expect(docs).toHaveLength(2);
    for (const doc of docs) {
      expect(doc.title).toBe('Blue Lagoon Spa — Spa');
      expect(doc.sourceId).toBe('b-1');
    }
  });

  it('falls back to the other locale description when the requested locale is missing', () => {
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'businesses');
    const en = docs.find((d) => d.locale === 'en')!;
    const el = docs.find((d) => d.locale === 'el')!;
    expect(en.content).toContain('Χαλαρωτικό σπα με θέα στη θάλασσα.');
    expect(el.content).toContain('Χαλαρωτικό σπα με θέα στη θάλασσα.');
  });

  it('includes address, phone, whatsapp, price band, tags, hours, tier and offerings', () => {
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceTable === 'businesses');
    const en = docs.find((d) => d.locale === 'en')!;
    expect(en.content).toContain('Address: 12 Harbor Road');
    expect(en.content).toContain('Phone: +30 210 1234567');
    expect(en.content).toContain('WhatsApp: +30 690 1234567');
    expect(en.content).toContain('Price: €€€');
    expect(en.content).toContain('Tags: relax, massage');
    expect(en.content).toContain('09:00-18:00');
    expect(en.content).toContain('Partner tier: exclusive');
    expect(en.content).toContain('Offering: Couples Massage — Side-by-side massage (80–120 EUR, 60 min)');
    expect(en.content).toContain('Offering: Quick Facial (from 40 EUR)');
  });

  it('omits the partner tier line for standard-tier businesses', () => {
    const standardInput: HotelKnowledgeInput = {
      ...emptyInput,
      businesses: [
        {
          id: 'b-2',
          name: 'Corner Taverna',
          categoryName: 'Restaurant',
          descriptionI18n: { en: 'Family-run taverna.' },
          address: '3 Market Street',
          phone: null,
          whatsapp: null,
          priceBand: null,
          tags: [],
          openingHoursJson: {},
          tier: 'standard',
          offerings: [],
        },
      ],
    };
    const docs = buildKnowledgeDocs(standardInput).filter((d) => d.sourceTable === 'businesses');
    const en = docs.find((d) => d.locale === 'en')!;
    expect(en.content).not.toContain('Partner tier');
    expect(en.content).not.toContain('Phone:');
    expect(en.content).not.toContain('WhatsApp:');
    expect(en.content).not.toContain('Price:');
    expect(en.content).not.toContain('Tags:');
  });
});

describe('buildKnowledgeDocs — empty content skipping', () => {
  it('skips docs whose content would be effectively empty', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      amenities: [
        { id: 'a-empty', name: 'Mystery Room', description: '   ', locationOnProperty: null, hoursJson: {} },
      ],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceId === 'a-empty');
    expect(docs).toHaveLength(0);
  });

  it('trims whitespace from content', () => {
    const input: HotelKnowledgeInput = {
      ...emptyInput,
      faqs: [{ id: 'f-3', locale: 'en', question: 'Late checkout?', answer: '  Ask reception.  ', tags: [] }],
    };
    const docs = buildKnowledgeDocs(input).filter((d) => d.sourceId === 'f-3');
    expect(docs[0]!.content).toBe('Ask reception.');
  });
});

describe('contentHash', () => {
  const base: KnowledgeDoc = {
    locale: 'en',
    sourceTable: 'faqs',
    sourceId: 'f-1',
    title: 'Is breakfast included?',
    content: 'Yes, from 7 to 10.',
  };

  it('is deterministic for the same doc', () => {
    expect(contentHash(base)).toBe(contentHash({ ...base }));
  });

  it('is a 64-character hex string', () => {
    expect(contentHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the content changes', () => {
    const changed: KnowledgeDoc = { ...base, content: 'Yes, from 7 to 11.' };
    expect(contentHash(base)).not.toBe(contentHash(changed));
  });

  it('changes when any other field changes', () => {
    expect(contentHash(base)).not.toBe(contentHash({ ...base, locale: 'el' }));
    expect(contentHash(base)).not.toBe(contentHash({ ...base, sourceTable: 'policies' }));
    expect(contentHash(base)).not.toBe(contentHash({ ...base, sourceId: 'f-2' }));
    expect(contentHash(base)).not.toBe(contentHash({ ...base, title: 'Different title' }));
  });
});

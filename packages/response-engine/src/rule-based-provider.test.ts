import { describe, it, expect, vi } from 'vitest';
import { RuleBasedProvider, type ResponseDataPort } from './rule-based-provider';
import { DEFAULT_RULES } from './ranking';

const HOTEL_ID = '00000000-0000-0000-0000-000000000001';
const SESSION_ID = '00000000-0000-0000-0000-000000000002';

function makeData(overrides: Partial<ResponseDataPort> = {}): ResponseDataPort {
  return {
    resolveAskFacts: vi.fn().mockResolvedValue({ time: '15:00' }),
    searchRecommendationCandidates: vi.fn().mockResolvedValue({
      candidates: [],
      cardFor: vi.fn().mockResolvedValue(null),
    }),
    getRules: vi.fn().mockResolvedValue(DEFAULT_RULES),
    notifyStaff: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('RuleBasedProvider', () => {
  it('answers ask_checkin from facts', async () => {
    const data = makeData();
    const p = new RuleBasedProvider(data);
    const r = await p.respond({
      sessionId: SESSION_ID,
      hotelId: HOTEL_ID,
      locale: 'en',
      message: 'what time is check in?',
      history: [],
      guestLocalTime: new Date(),
    });
    expect(r.intent).toBe('ask_checkin');
    expect(r.reply).toContain('15:00');
  });

  it('falls back when ask facts missing', async () => {
    const data = makeData({ resolveAskFacts: vi.fn().mockResolvedValue(null) });
    const p = new RuleBasedProvider(data);
    const r = await p.respond({
      sessionId: SESSION_ID,
      hotelId: HOTEL_ID,
      locale: 'en',
      message: 'what time is check in?',
      history: [],
      guestLocalTime: new Date(),
    });
    expect(r.reply.toLowerCase()).toContain("don't have");
  });

  it('routes staff_request and notifies', async () => {
    const data = makeData();
    const p = new RuleBasedProvider(data);
    const r = await p.respond({
      sessionId: SESSION_ID,
      hotelId: HOTEL_ID,
      locale: 'en',
      message: 'I need to talk to reception, there is a problem',
      history: [],
      guestLocalTime: new Date(),
    });
    expect(r.needsStaff).toBe(true);
    expect(data.notifyStaff).toHaveBeenCalledOnce();
  });

  it('routes recommend_restaurant and ranks', async () => {
    const card = {
      businessId: '11111111-1111-1111-1111-111111111111',
      name: 'Taverna Acropolis',
      category: 'restaurant',
      description: null,
      distanceKm: 0.4,
      openNow: true,
      priceBand: 2,
      imageUrl: null,
      promoted: true,
      referralUrl: 'https://example.com/r/abc',
    };
    const data = makeData({
      searchRecommendationCandidates: vi.fn().mockResolvedValue({
        candidates: [
          {
            businessId: card.businessId,
            keywordMatch: 0.8,
            distanceKm: 0.4,
            openNow: true,
            categoryFit: true,
            preferenceMatch: 0,
            partnership: { subscriptionTier: 'featured', paidPriorityScore: 80, commissionPct: 10 },
          },
        ],
        cardFor: vi.fn().mockResolvedValue(card),
      }),
    });
    const p = new RuleBasedProvider(data);
    const r = await p.respond({
      sessionId: SESSION_ID,
      hotelId: HOTEL_ID,
      locale: 'en',
      message: 'where can I have dinner tonight?',
      history: [],
      guestLocalTime: new Date(),
    });
    expect(r.intent).toBe('recommend_restaurant');
    expect(r.recommendations).toHaveLength(1);
    expect(r.recommendations?.[0]?.name).toBe('Taverna Acropolis');
  });

  it('out_of_scope returns fallback', async () => {
    const data = makeData();
    const p = new RuleBasedProvider(data);
    const r = await p.respond({
      sessionId: SESSION_ID,
      hotelId: HOTEL_ID,
      locale: 'en',
      message: 'lorem ipsum dolor sit amet',
      history: [],
      guestLocalTime: new Date(),
    });
    expect(r.intent).toBe('out_of_scope');
  });
});

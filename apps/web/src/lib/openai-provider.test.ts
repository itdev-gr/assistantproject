import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import type { ResponseDataPort } from '@aga/response-engine';
import { DEFAULT_RULES } from '@aga/response-engine';
import type { ResponseProvider, ResponseProviderOutput } from '@aga/chat';
import { embedTexts, completeChat } from './openai';
import { OpenAiProvider } from './openai-provider';

vi.mock('./openai');

const mockEmbedTexts = vi.mocked(embedTexts);
const mockCompleteChat = vi.mocked(completeChat);

const HOTEL_ID = '00000000-0000-0000-0000-000000000001';
const SESSION_ID = '00000000-0000-0000-0000-000000000002';
const HOTEL_NAME = 'Aegean Blue Resort';

function makeData(overrides: Partial<ResponseDataPort> = {}): ResponseDataPort {
  return {
    resolveAskFacts: vi.fn().mockResolvedValue(null),
    searchRecommendationCandidates: vi.fn().mockResolvedValue({
      candidates: [],
      cardFor: vi.fn().mockResolvedValue(null),
    }),
    getRules: vi.fn().mockResolvedValue(DEFAULT_RULES),
    notifyStaff: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeAdmin(rpcResult: { data: unknown; error: { message: string } | null } = { data: [], error: null }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as SupabaseClient<Database>;
}

function makeFallback(result: ResponseProviderOutput): ResponseProvider {
  return { respond: vi.fn().mockResolvedValue(result) };
}

const FALLBACK_RESULT: ResponseProviderOutput = { reply: 'fallback reply', intent: 'out_of_scope' };

const baseInput = {
  sessionId: SESSION_ID,
  hotelId: HOTEL_ID,
  locale: 'en' as const,
  history: [],
  guestLocalTime: new Date('2026-07-14T10:00:00Z'),
};

describe('OpenAiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbedTexts.mockResolvedValue([[0.1, 0.2, 0.3]]);
    mockCompleteChat.mockResolvedValue('Grounded answer from the assistant.');
  });

  it('returns the grounded completion with retrieved chunk ids as contextIds', async () => {
    const chunks = [
      { id: 'chunk-1', title: 'Check-in', content: 'Check-in is at 15:00.', source_table: 'hours', source_id: 'h1', similarity: 0.9 },
      { id: 'chunk-2', title: 'Check-out', content: 'Check-out is at 11:00.', source_table: 'hours', source_id: 'h2', similarity: 0.8 },
    ];
    const admin = makeAdmin({ data: chunks, error: null });
    const data = makeData();
    const fallback = makeFallback(FALLBACK_RESULT);
    const provider = new OpenAiProvider({ admin, data, fallback, hotelName: HOTEL_NAME });

    const result = await provider.respond({
      ...baseInput,
      message: 'what time is check in?',
    });

    expect(result.reply).toBe('Grounded answer from the assistant.');
    expect(result.contextIds).toEqual(['chunk-1', 'chunk-2']);
    expect(result.intent).toBe('ask_checkin');
    expect(fallback.respond).not.toHaveBeenCalled();
    expect(data.searchRecommendationCandidates).not.toHaveBeenCalled();
  });

  it('resolves recommendation cards from the data port and includes their names in the prompt', async () => {
    const card = {
      businessId: '11111111-1111-1111-1111-111111111111',
      name: 'Taverna Acropolis',
      category: 'restaurant',
      description: 'Seaside taverna',
      distanceKm: 0.4,
      openNow: true,
      priceBand: 2,
      imageUrl: null,
      promoted: true,
      referralUrl: 'https://example.com/r/abc',
    };
    const admin = makeAdmin({ data: [], error: null });
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
    const fallback = makeFallback(FALLBACK_RESULT);
    const provider = new OpenAiProvider({ admin, data, fallback, hotelName: HOTEL_NAME });

    const result = await provider.respond({
      ...baseInput,
      message: 'where can I have dinner tonight?',
    });

    expect(result.intent).toBe('recommend_restaurant');
    expect(result.recommendations).toEqual([card]);
    expect(data.getRules).toHaveBeenCalledWith(HOTEL_ID);
    expect(mockCompleteChat).toHaveBeenCalledOnce();
    const [messages] = mockCompleteChat.mock.calls[0]!;
    expect(messages[0]!.content).toContain('Taverna Acropolis');
  });

  it('falls back when the OpenAI completion call throws', async () => {
    mockCompleteChat.mockRejectedValue(new Error('rate limited upstream'));
    const admin = makeAdmin({ data: [], error: null });
    const data = makeData();
    const fallback = makeFallback(FALLBACK_RESULT);
    const provider = new OpenAiProvider({ admin, data, fallback, hotelName: HOTEL_NAME });

    const result = await provider.respond({
      ...baseInput,
      message: 'what time is check in?',
    });

    expect(fallback.respond).toHaveBeenCalledOnce();
    expect(result).toEqual(FALLBACK_RESULT);
  });

  it('delegates staff_request straight to the fallback without calling OpenAI', async () => {
    const admin = makeAdmin({ data: [], error: null });
    const data = makeData();
    const fallback = makeFallback({ reply: 'Staff notified.', intent: 'staff_request', needsStaff: true });
    const provider = new OpenAiProvider({ admin, data, fallback, hotelName: HOTEL_NAME });

    const input = { ...baseInput, message: 'I need to talk to reception, there is a problem' };
    const result = await provider.respond(input);

    expect(fallback.respond).toHaveBeenCalledWith(input);
    expect(result).toEqual({ reply: 'Staff notified.', intent: 'staff_request', needsStaff: true });
    expect(mockEmbedTexts).not.toHaveBeenCalled();
    expect(mockCompleteChat).not.toHaveBeenCalled();
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it('falls back when the completion is empty', async () => {
    mockCompleteChat.mockResolvedValue('');
    const admin = makeAdmin({ data: [], error: null });
    const data = makeData();
    const fallback = makeFallback(FALLBACK_RESULT);
    const provider = new OpenAiProvider({ admin, data, fallback, hotelName: HOTEL_NAME });

    const result = await provider.respond({
      ...baseInput,
      message: 'what time is check in?',
    });

    expect(fallback.respond).toHaveBeenCalledOnce();
    expect(result).toEqual(FALLBACK_RESULT);
  });

  it('falls back when the knowledge-chunk retrieval RPC errors', async () => {
    const admin = makeAdmin({ data: null, error: { message: 'connection reset' } });
    const data = makeData();
    const fallback = makeFallback(FALLBACK_RESULT);
    const provider = new OpenAiProvider({ admin, data, fallback, hotelName: HOTEL_NAME });

    const result = await provider.respond({
      ...baseInput,
      message: 'what time is check in?',
    });

    expect(fallback.respond).toHaveBeenCalledOnce();
    expect(result).toEqual(FALLBACK_RESULT);
    expect(mockCompleteChat).not.toHaveBeenCalled();
  });
});

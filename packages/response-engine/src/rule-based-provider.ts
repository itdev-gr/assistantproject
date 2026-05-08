import type {
  ResponseProvider,
  ResponseProviderInput,
  ResponseProviderOutput,
} from '@aga/chat';
import type { Locale, RecommendationCard } from '@aga/api-contracts';
import { matchIntent, isAskIntent, isRecommendationIntent, type IntentSlug } from './intent-matcher.js';
import { rank, type RankingCandidate, type RecommendationRules } from './ranking.js';
import { renderTemplate, FALLBACK } from './templates.js';

/**
 * Adapter port: how the provider talks to the database. The Edge Function
 * provides a concrete implementation that runs the SQL queries with RLS bypassed
 * (service role) and returns sanitized rows.
 */
export interface ResponseDataPort {
  resolveAskFacts(input: {
    hotelId: string;
    intent: IntentSlug;
    locale: Locale;
    roomId?: string;
    text: string;
  }): Promise<Record<string, string | number | null> | null>;

  searchRecommendationCandidates(input: {
    hotelId: string;
    intent: IntentSlug;
    locale: Locale;
    text: string;
    guestLocalTime: Date;
  }): Promise<{
    candidates: RankingCandidate[];
    /** Resolves a businessId to a card we can return to the UI */
    cardFor(id: string): Promise<RecommendationCard | null>;
  }>;

  getRules(hotelId: string): Promise<RecommendationRules>;

  notifyStaff(input: {
    hotelId: string;
    sessionId: string;
    text: string;
  }): Promise<void>;
}

export class RuleBasedProvider implements ResponseProvider {
  constructor(private readonly data: ResponseDataPort) {}

  async respond(input: ResponseProviderInput): Promise<ResponseProviderOutput> {
    const match = matchIntent(input.message, input.locale);

    if (match.slug === 'staff_request') {
      await this.data.notifyStaff({
        hotelId: input.hotelId,
        sessionId: input.sessionId,
        text: input.message,
      });
      return {
        reply: renderTemplate('staff_request', input.locale, { values: {} }),
        intent: match.slug,
        needsStaff: true,
      };
    }

    if (match.slug === 'smalltalk') {
      return {
        reply: renderTemplate('smalltalk', input.locale, { values: {} }),
        intent: match.slug,
      };
    }

    if (match.slug === 'out_of_scope') {
      return { reply: FALLBACK[input.locale], intent: match.slug };
    }

    if (isAskIntent(match.slug)) {
      const facts = await this.data.resolveAskFacts({
        hotelId: input.hotelId,
        intent: match.slug,
        locale: input.locale,
        roomId: input.roomId,
        text: input.message,
      });
      if (!facts) return { reply: FALLBACK[input.locale], intent: match.slug };
      return {
        reply: renderTemplate(match.slug, input.locale, { values: facts }),
        intent: match.slug,
        contextIds: typeof facts.id === 'string' ? [facts.id] : undefined,
      };
    }

    if (isRecommendationIntent(match.slug)) {
      const [rules, search] = await Promise.all([
        this.data.getRules(input.hotelId),
        this.data.searchRecommendationCandidates({
          hotelId: input.hotelId,
          intent: match.slug,
          locale: input.locale,
          text: input.message,
          guestLocalTime: input.guestLocalTime,
        }),
      ]);

      const ranked = rank(search.candidates, rules);
      if (ranked.length === 0) {
        return { reply: FALLBACK[input.locale], intent: match.slug };
      }

      const cards = (
        await Promise.all(ranked.map((r) => search.cardFor(r.businessId)))
      ).filter((c): c is RecommendationCard => c != null);

      return {
        reply: renderTemplate(match.slug, input.locale, { values: {} }),
        intent: match.slug,
        recommendations: cards,
        contextIds: cards.map((c) => c.businessId),
      };
    }

    return { reply: FALLBACK[input.locale], intent: 'out_of_scope' };
  }
}

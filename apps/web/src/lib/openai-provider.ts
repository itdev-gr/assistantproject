import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import type { ResponseProvider, ResponseProviderInput, ResponseProviderOutput, RecommendationCard } from '@aga/chat';
import type { ResponseDataPort } from '@aga/response-engine';
import { matchIntent, isRecommendationIntent, rank } from '@aga/response-engine';
import { embedTexts, completeChat } from './openai';
import { buildChatMessages } from './build-prompt';

type DB = SupabaseClient<Database>;

/**
 * LLM-backed ResponseProvider: grounds replies in retrieved knowledge chunks
 * (pgvector similarity search) plus the same recommendation-card pipeline
 * RuleBasedProvider uses (money path is untouched — the LLM only references
 * card names in its prose, it never invents businesses or referral links).
 *
 * Any failure anywhere in respond() — intent match, retrieval, or the OpenAI
 * call itself — degrades to the injected `fallback` (a RuleBasedProvider
 * instance) so guests always get a reply.
 */
export class OpenAiProvider implements ResponseProvider {
  constructor(
    private readonly deps: {
      admin: DB;
      data: ResponseDataPort;
      fallback: ResponseProvider;
      hotelName: string;
    },
  ) {}

  async respond(input: ResponseProviderInput): Promise<ResponseProviderOutput> {
    try {
      const match = matchIntent(input.message, input.locale);

      if (match.slug === 'staff_request') {
        // The rule provider performs notifyStaff + the canned reply; no LLM involvement.
        return this.deps.fallback.respond(input);
      }

      // The query embedding depends only on the guest's message, so start it
      // now and let it run alongside the card pipeline below instead of after
      // it. That hides a whole OpenAI round trip from the guest.
      const embeddingPromise = embedTexts([input.message]);
      // The pipeline below can throw before we await this; attaching a no-op
      // handler keeps that from surfacing as an unhandled rejection. The real
      // error still propagates where the promise is awaited.
      embeddingPromise.catch(() => {});

      // Attach place cards for explicit recommendation intents and for
      // free-form questions the keyword matcher couldn't classify — the data
      // port then searches every category and only returns real matches.
      let cards: RecommendationCard[] | undefined;
      if (isRecommendationIntent(match.slug) || match.slug === 'out_of_scope') {
        // Independent queries — the rule-based provider parallelizes these too.
        const [search, rules] = await Promise.all([
          this.deps.data.searchRecommendationCandidates({
            hotelId: input.hotelId,
            intent: match.slug,
            locale: input.locale,
            text: input.message,
            guestLocalTime: input.guestLocalTime,
          }),
          this.deps.data.getRules(input.hotelId),
        ]);
        const ranked = rank(search.candidates, rules);
        cards = (await Promise.all(ranked.map((r) => search.cardFor(r.businessId)))).filter(
          (c): c is RecommendationCard => c != null,
        );
      }

      const [queryEmbedding] = await embeddingPromise;
      const { data: chunks, error } = await this.deps.admin.rpc('match_knowledge_chunks', {
        p_hotel: input.hotelId,
        p_embedding: JSON.stringify(queryEmbedding),
        p_locale: input.locale,
        p_count: 8,
      });
      if (error) throw new Error(error.message);

      const messages = buildChatMessages({
        locale: input.locale,
        hotelName: this.deps.hotelName,
        chunks: (chunks ?? []).map((c) => ({ id: c.id, title: c.title, content: c.content })),
        history: input.history
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role as 'guest' | 'assistant', content: m.content }))
          .slice(-10),
        userMessage: input.message,
        cards: cards?.map((c) => ({ name: c.name, category: c.category, description: c.description, offer: c.offer ?? null })),
      });

      const reply = await completeChat(messages, { maxTokens: 500 });
      if (!reply) throw new Error('empty completion');

      return {
        reply,
        intent: match.slug,
        recommendations: cards?.length ? cards : undefined,
        contextIds: (chunks ?? []).map((c) => c.id),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      console.error('openai provider failed, falling back:', message);
      return this.deps.fallback.respond(input);
    }
  }
}

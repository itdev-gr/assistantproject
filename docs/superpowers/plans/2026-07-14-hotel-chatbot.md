# Per-Hotel AI Chatbot (OpenAI) — Grounded Assistant Plan

## Context

The platform's chat currently runs on a rule-based engine (keyword intents + templates). The user wants a real chatbot, powered by OpenAI (key available), that knows **everything the project knows about each hotel** — the hotel's own content (FAQs, policies, amenities, hours, events) *plus* everything associated with it (partner businesses, their offerings, prices, hours, contact info) — strictly scoped **per hotel**. It appears as a **floating bubble, bottom-left**: on each hotel's guest page, in the widget hotels embed on their own sites, and on our homepage as a demo (Aegean Blue hotel).

The architecture anticipated this exactly: `packages/chat/src/types.ts` defines `ResponseProvider` with a doc comment saying an external LLM later "implements another class that satisfies this interface — no changes to the schema, UI, or revenue tracking." We swap the brain, keep everything else: sessions, message persistence, recommendation cards, referral links, paid-tier ranking (the revenue stream must keep flowing through the existing pipeline).

## The knowledge pipeline (per hotel)

```
   ┌─ SOURCES (all hotel_id-scoped) ──────────────────────────────┐
   │ hotels (profile/timezone) · faqs · policies · amenities      │
   │ hours · events_internal · + via partnerships: businesses     │
   │ (description_i18n, tags, address, phones, opening hours,     │
   │  price band) · business_offerings (title/desc/price/duration)│
   └──────────────┬───────────────────────────────────────────────┘
                  │ 1. ASSEMBLE  build_knowledge_docs(hotelId):
                  │    one text doc per fact-unit, per locale (el+en),
                  │    with {hotel_id, locale, source_table, source_id}
                  ▼
            2. EMBED  OpenAI text-embedding-3-small (1536d);
               skip unchanged docs via content_hash (sha256)
                  ▼
        3. STORE  knowledge_chunks table (pgvector, HNSW index)
           — migration 0012 enables `vector` extension
                  ▼
   4. SYNC  nightly Vercel cron /api/cron/reindex-knowledge
      + "Reindex knowledge" button in admin  + stale-chunk deletion
                  ▼
   5. RETRIEVE (per question)  embed query → SQL function
      match_knowledge_chunks(hotel_id, embedding, k=8, locale-pref)
                  ▼
   6. GENERATE  OpenAI chat completion (env OPENAI_MODEL,
      default gpt-4o-mini): system prompt = persona + rules
      ("answer ONLY from the provided facts; if unknown say so and
      offer reception/staff; reply in the guest's language") +
      retrieved facts + conversation history (last 10 messages)
                  ▼
   7. RECOMMENDATIONS  unchanged money path: existing intent
      matcher detects recommend_* → existing searchRecommendation-
      Candidates + rank() (tier bias, paid priority) → cards with
      signed referral URLs; the LLM references them in its text
      but the cards themselves come from the existing pipeline
                  ▼
   8. RESPOND  same ResponseProviderOutput → same /api/chat
      persistence (messages.retrieved_context_ids = chunk ids)
```

Failure behavior: any OpenAI error (or missing key) → fall back to the existing `RuleBasedProvider` for that message, log the error. The bot degrades, never breaks.

Rollout switch: `feature_flags` table (already exists) — flag `llm_chat`, per-hotel or global; enabled first for the demo hotel only.

## Cost & abuse protection (new — none exists today)

- Rate limit `/api/chat`: 20 messages/10 min per session + 60/10 min per IP (IP stored as HMAC hash, no raw IPs), returns 429; applies to both providers. Implemented as a small `rate_limit_events` table + pure window-check function (unit-tested).
- `max_tokens` cap on completions; context capped at 8 chunks + 10 history messages.
- Existing 2000-char input cap stays.

## Implementation (files)

**Migration `supabase/migrations/0012_knowledge_chunks.sql`**
- `create extension if not exists vector;`
- `knowledge_chunks(id uuid pk, hotel_id uuid fk, locale text, source_table text, source_id uuid, title text, content text, content_hash text, embedding vector(1536), updated_at timestamptz)` + unique `(hotel_id, locale, source_table, source_id)` + HNSW index on embedding; RLS on, no policies (service-role only).
- `rate_limit_events(key text, created_at timestamptz)` + index; helper cleanup.
- SQL function `match_knowledge_chunks(p_hotel uuid, p_embedding vector(1536), p_locale text, p_count int)` → id, title, content, source_table, source_id, similarity.
- Seed `feature_flags`: `llm_chat` enabled for the demo hotel.
- Mirror new tables in `packages/db/src/database.types.ts`.

**Knowledge layer (`apps/web/src/lib/`)** — pure logic split from I/O, stripe-events style:
- `knowledge-docs.ts` (pure, unit-tested): row fixtures → chunk docs (title/content per locale) + `contentHash()`.
- `knowledge-indexer.ts`: fetch sources for a hotel (or all hotels), diff by hash, batch-embed changed docs via OpenAI, upsert/delete `knowledge_chunks`.
- `openai.ts`: OpenAI client singleton (`OPENAI_API_KEY`), `embed(texts)`, `complete(messages, opts)`.
- `openai-provider.ts`: `OpenAiProvider implements ResponseProvider` — retrieval + prompt assembly (`build-prompt.ts`, pure, unit-tested) + completion + recommend-intent branch reusing the existing `ResponseDataPort` + `rank()`; falls back to `RuleBasedProvider` on error.
- `rate-limit.ts`: pure window logic + DB-backed check (unit-tested logic).

**API routes**
- `apps/web/src/app/api/chat/route.ts`: add rate-limit check → 429; provider selection: `llm_chat` flag → `OpenAiProvider` else `RuleBasedProvider` (both behind the same interface; ~10-line change).
- `apps/web/src/app/api/cron/reindex-knowledge/route.ts`: `CRON_SECRET`-guarded, reindexes all active hotels; register in `apps/web/vercel.json` crons (daily 03:00 UTC).
- Admin server action `reindexKnowledge(hotelId?)` + button on the admin dashboard (pattern: `InvoiceCommissionsButton`).

**UI (bottom-left bubble)**
- New `apps/web/src/components/public/FloatingAssistant.tsx` (client): fixed bottom-left launcher, framer-motion open/close (spring panel, reduced-motion respected), Aegean styling (sky/navy, serif title), bilingual, mobile = full-width sheet. Uses the existing `useConversation` hook from `@aga/chat` with `hotelSlug` prop; renders existing-style recommendation cards.
- Mount on public pages via `[locale]/page.tsx` (+ about page) with `hotelSlug` = `NEXT_PUBLIC_DEMO_HOTEL_SLUG` (env, default `aegean-blue`); mount on the guest hotel page `/h/[hotelSlug]` for mobile (desktop keeps the existing sidebar chat).
- `apps/widget/src/Bubble.tsx`: bubble moves `right:16px` → `left:16px` (hotels' embedded widget, per request).

**Env (new)**: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`, `NEXT_PUBLIC_DEMO_HOTEL_SLUG=aegean-blue` → `.env.example`, `apps/web/.env.local` (NOT repo root — Next ignores it), turbo.json env, Vercel production. Models swappable via env, no code change.

## What stays untouched

Referral/booking/commission tracking, `ChatRequest`/`ChatResponse` contracts, message persistence, the rule-based engine (fallback + non-flagged hotels), owner/admin dashboards (except the reindex button), Stripe billing.

## Verification

1. Unit: doc assembly, hashing, prompt building, rate-limit window, provider with mocked OpenAI — `pnpm --filter @aga/web test`; `pnpm typecheck`; build.
2. Pipeline dry run (real key, test hotel): run indexer for Aegean Blue → inspect `knowledge_chunks` rows; ask EL+EN questions through `/api/chat` locally: breakfast hours (from `hours`), wifi (FAQ), "πού να φάμε ψάρι;" (cards with referral URLs present, promoted first), unknown question → honest "ask reception" + `needsStaff` unset; verify `retrieved_context_ids` persisted.
3. Rate limit: 21st message in window → 429.
4. Fallback: break the key locally → answers still come (rule-based), error logged.
5. UI: bubble bottom-left on homepage (desktop + 375px), opens/closes smoothly, works in EL/EN; guest page mobile bubble.
6. Deploy: env vars to Vercel → push → verify production chat + nightly cron registered; reindex via admin button; production Q&A smoke test.

## Cost note (test-scale)

Indexing the demo hotel ≈ a few hundred embedding calls ≈ well under €0.01; each guest message ≈ €0.001–0.002 on gpt-4o-mini. The rate limiter is the main cost guard.

# Fix Chatbot Recommendation Quality — Analysis & Plan

## What you saw, and why it happens (evidence-based)

You asked *"where can I eat good food today"* and got Italian and a grill house first. I reproduced it and traced the exact cause. Three separate problems combine:

**1. The recommendation ranking is running on fake signals.** In `apps/web/src/lib/response-data-port.ts:128-132`, every candidate business gets identical hardcoded values — `keywordMatch: 0.5, distanceKm: 1.0, openNow: true, categoryFit: true` (a leftover MVP stub, flagged in the code as "not computed yet"). With every relevance signal equal, the ONLY thing that differentiates restaurants is **who pays more** (tier × paid-priority): La Pasta Italiana (exclusive, 90) → Sunset Grill (featured, 80) → Taverna Apolafsi (featured, 50). Your question's words never influence the order — "fish", "pasta", "good food" all produce the same paid ladder.

**2. "Today" cannot be answered honestly — there is no opening-hours data.** All 4 restaurants have empty `opening_hours_json` in the database, and there's no admin UI to enter it. Meanwhile the ranking stub claims everyone is "open now". (The visible cards at least show no open/closed badge — verified — so guests aren't directly lied to, but the ranking pretends everyone is open and the bot can't reason about "today".)

**3. The reply text breaks its own formatting rules.** The reply contained raw markdown (`**La Pasta Italiana**`, numbered list) duplicating all four cards — the model ignores the current one-line "no markdown" instruction when it decides to enumerate. Widgets render this as literal asterisks.

Side observation (not a bug, your call): Mezedopolio Pelagos has an exclusive/95 partnership row that is **inactive**, so it ranks last, shows no "Featured" badge, and links to its plain website instead of a tracked referral link. If that's unintended, reactivate it in Admin → Partnerships.

## The fix plan

### Phase A — Real relevance signals (the core fix)
In `response-data-port.ts`, replace the four stubs with computed values (the ranking engine `rank()` in `packages/response-engine/src/ranking.ts` already consumes them with proper weights — no engine changes needed):

- **keywordMatch**: token-overlap score between the guest's normalized question and the business's name + tags + description (reusing `normalize`/`tokenize` from `@aga/response-engine`). "fish" → seafood tavern scores high; "pasta" → Italian scores high.
- **distanceKm**: real distance (haversine) from the hotel to each business — both have coordinates in the DB (verified). The chat route will pass the hotel's lat/lng through the already-existing-but-unused `hotelLocation` field. Cards then show true distances instead of nothing.
- **openNow**: computed from `opening_hours_json` + the guest's local time when hours exist; **null (unknown) when absent** — never a fabricated "open".
- `preferenceMatch` stays 0 (no guest-preference feature exists — not inventing one).

Paid placement still matters — that's your business model — but it becomes a **boost among relevant options** instead of the only signal.

### Phase B — Opening-hours data entry + demo data
- Add an opening-hours editor (per-day open/close) to the admin business form, storing the existing `opening_hours_json` format.
- Seed realistic hours for the 10 demo businesses so "today/now" questions work immediately.
- The nightly knowledge reindex already picks hours up into the chatbot's facts automatically.

### Phase C — Harden the reply format + relevance-aware text
- Strengthen the system prompt in `apps/web/src/lib/build-prompt.ts`: plain text only (explicitly: no asterisks, no numbered lists), do NOT enumerate all recommendations (the cards below the message already show them) — one or two sentences highlighting the best match for what the guest actually asked.
- Unit tests updated for the new prompt rules; new unit tests for the keyword scorer, the open-now calculator (timezone/weekday/overnight edge cases), and the distance math.

### Phase D — Verification battery (before deploy)
Local + production after deploy: "where can we eat fresh fish" → seafood tavern first; "pasta or pizza tonight" → Italian first; "good food today" → open (or unknown) places, sensible text, no markdown; distances visible on cards; referral links intact on all partner cards; existing 99-test suite + new tests green.

**Not changing:** the money path (signed referral links, tier boosts), chat contracts, the knowledge/RAG pipeline, rate limiting.

**Effort:** Phase A+C are the substance (~a few hours with reviews); B is small; the whole thing ships together.

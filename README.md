# AI Guest Assistant Platform

Multi-tenant assistant for hotels and Airbnbs. Three surfaces (guest QR/widget, owner dashboard, super-admin) sharing one Next.js + Supabase codebase.

> **Scope rule:** No LLM is integrated in this build. The chat surface uses a deterministic Structured Response Engine (`packages/response-engine`) that exposes a `ResponseProvider` interface. An external chatbot or LLM can be plugged in later by implementing that one interface — no schema, UI, or revenue-flow changes.

The full plan is in `/Users/marios/.claude/plans/client-requested-the-below-floating-taco.md`.

## Stack

- Next.js 15 + React 19 + TypeScript + Tailwind v3 + shadcn-style primitives
- Supabase (Postgres + Auth + Storage + Edge Functions)
- pnpm workspaces + Turborepo
- next-intl (Greek primary, English secondary)
- Vite library bundle for the embeddable widget (Preact, ≤45 KB target)

## Layout

```
apps/
  web/             Next.js 15 — guest pages, owner dashboard, admin, /api/*
  widget/          Vite library — produces widget.{el,en}.iife.js
packages/
  ui/              Shared design tokens + primitives
  chat/            Headless chat hook + ResponseProvider interface
  db/              Supabase typed client + signed session token
  response-engine/ Intent matcher + ranking algorithm + RuleBasedProvider
  api-contracts/   Zod schemas
  i18n/            next-intl messages (el, en)
  config/          ESLint, tsconfig, Tailwind preset
supabase/
  migrations/      0001..0006 — schema, RLS, seeds for intents+rules
  seeds/01_demo.sql — one demo hotel + 25 partners + 30 FAQs
  tests/           pgTAP cross-tenant RLS tests
```

## Local setup

Prereqs: Node 20.11+, pnpm 9, [Supabase CLI](https://supabase.com/docs/guides/cli), Docker.

```bash
# 1. install
pnpm install

# 2. start local Supabase (Postgres on :54322, Studio on :54323)
pnpm db:start

# 3. apply migrations + seed
supabase db reset    # runs migrations and seeds/01_demo.sql

# 4. generate typed DB types into packages/db/src/database.types.ts
pnpm db:types

# 5. copy env templates
cp .env.example apps/web/.env.local
# edit values (Supabase URL/keys come from `supabase status`)

# 6. run dev server
pnpm dev
```

Visit:
- `http://localhost:3000/el/h/aegean-blue` — guest chat for the demo hotel
- `http://localhost:3000/el/owner` — owner dashboard skeleton
- `http://localhost:3000/el/admin` — super-admin skeleton

## Tests

```bash
pnpm test             # all unit tests (response-engine, db helpers)
pnpm db:test          # pgTAP RLS tests against local Supabase
pnpm typecheck
pnpm lint
```

## Embedding the widget on a hotel website

```html
<script async src="https://app.example.com/api/widget/loader.js" data-hotel="aegean-blue"></script>
```

The loader bootstraps the locale-specific bundle (`widget.el.iife.js` or `widget.en.iife.js`) and mounts a `<guest-assistant>` Web Component with Shadow DOM.

## Adding the future LLM / chatbot

Implement `ResponseProvider` from `@aga/chat`:

```ts
import type { ResponseProvider } from '@aga/chat';

export class MyChatbotProvider implements ResponseProvider {
  async respond(input) {
    // call your chatbot, return { reply, intent, recommendations? }
  }
}
```

Then in `apps/web/src/app/api/chat/route.ts`, swap `new RuleBasedProvider(...)` for your class. Done.

## Pending work (Week 1 ships here; later weeks per the plan)

- [ ] Supabase project provisioning (EU-Frankfurt) and CI secrets
- [ ] Vercel project + preview-deploy wiring
- [ ] Owner CRUD pages (FAQs/amenities/hours/policies/rooms) — week 4–5
- [ ] Super-admin CRUD pages — week 6
- [ ] Magic-link auth + role gating — week 3
- [ ] Referral redirect Edge Function + signed URLs — week 10
- [ ] Partner-webhook verification + commission accrual — week 10
- [ ] QR PDF generator — week 10
- [ ] Sentry + Logflare wiring
- [ ] Playwright E2E suite — week 11

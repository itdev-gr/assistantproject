# About Page Redesign — Design

**Date:** 2026-07-14 · **Status:** approved

## Why

The shipped About page (spec `2026-07-14-about-us-page-design.md`) is functional but plain: text-only sections, no imagery, minimal SEO metadata. The user wants a richer editorial page — image hero, more content depth, stronger SEO — matching the visual quality of the homepage.

## Scope decision

User decisions:
- **Imagery:** new free-license Unsplash photos stored locally in `apps/web/public/images/` (same convention as `hero-rhodes.jpg`), not business photos from Supabase.
- **New sections:** FAQ (with FAQPage JSON-LD), values/why-trust-us grid, photo mosaic interlude. **No live stats band** — the page stays fully static with no database dependency.
- The h1 copy stays "Built on the island, for the island." / «Φτιαγμένο στο νησί, για το νησί.» — existing e2e tests depend on it and the copy is good.

## Architecture

The single `AboutContent.tsx` client component is replaced by focused section components under `apps/web/src/components/public/about/`:

| Component | Kind | Purpose |
|---|---|---|
| `AboutHero.tsx` | client (parallax) | Full-bleed image hero, eyebrow + h1 + subtitle |
| `AboutStory.tsx` | client (motion) | Two-column editorial story + mission beside a photo |
| `ValuesGrid.tsx` | client (motion) | 4 value cards |
| `PhotoMosaic.tsx` | server | 3-image editorial collage, lazy-loaded |
| `HowItWorks.tsx` | client (motion) | Existing 3 audience cards restyled with step numbers |
| `AboutFaq.tsx` | server | 6 Q&As as native `<details>/<summary>` accordions |
| `AboutCta.tsx` | client (motion) | Gradient CTA band: Browse + List your business |

`apps/web/src/app/[locale]/about/page.tsx` composes them and owns the whole SEO layer. `AboutContent.tsx` is deleted. Copy stays inline bilingual (`t(en, el)` helper) per site convention.

## Sections & content

1. **Hero** — like `HomeHero`: `next/image` fill + `priority`, framer-motion parallax, `bg-gradient-to-b from-sky-950/70 …` contrast overlay, `SiteHeader` in existing `overlay` mode, ~60–70svh. Eyebrow "About us / Σχετικά με εμάς", the existing h1, new subtitle.
2. **Story + mission** — two-column: serif h2s + paragraphs (existing story/mission copy, expanded) beside a supporting photo. Stacks on mobile.
3. **Values grid** — 4 cards: no paid rankings; picked by people who live here; verified & current details; every visit supports the community. Existing card styling (`rounded-xl border bg-card …`).
4. **Photo mosaic** — 3 photos (taverna table, beach cove, village street) in an asymmetric collage, bilingual alt text, `loading="lazy"` defaults.
5. **How it works** — the 3 existing audience cards (visitors / hotels / businesses) with step numbers, copy unchanged.
6. **FAQ** — 6 bilingual Q&As: Is it free for visitors? · How are places chosen? · Do businesses pay for ranking? (no — placement tiers never change curation) · How does my business get listed? · What is the AI hotel assistant? · Which areas are covered? Native `<details>/<summary>` so all text is crawlable without JS; styled chevron rotation via CSS `group-open:`.
7. **CTA band** — soft sky gradient, `Button` links to `/` and `/login`.

## Images

5 new Unsplash photos (free license) into `apps/web/public/images/`: `about-hero.jpg` (~1800px, hero), `about-harbor.jpg` (story column), and `about-taverna.jpg`, `about-beach.jpg`, `about-village.jpg` (mosaic) at ~1200px — target ≤450KB for the hero, ≤350KB for the rest. `ATTRIBUTION.txt` gains one line per photo (photographer + URL), same format as the existing entry. If a chosen photo URL is unavailable at implementation time, the implementer substitutes an equivalent free Unsplash photo of the same subject and records the substitution in `ATTRIBUTION.txt`.

## SEO layer (all in `about/page.tsx`, plus one root-layout line)

- `metadataBase` is currently unset app-wide, so relative OG image paths would not resolve to absolute URLs. Targeted improvement: add to the root layout's `metadata` export: `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://assistantproject-web.vercel.app')`. Document `NEXT_PUBLIC_SITE_URL` in `.env.example`.
- `generateMetadata`: localized title/description (existing), plus
  - `alternates`: canonical (`/about` for el, `/en/about` for en) and `languages` hreflang map: `el` → `/about`, `en` → `/en/about`, `x-default` → `/about`.
  - `openGraph`: `type: 'website'`, localized `locale` (`el_GR`/`en_US`), title, description, `images: ['/images/about-hero.jpg']`, `siteName: 'Local Guide'`.
  - `twitter`: `card: 'summary_large_image'`, title, description, image.
- Two JSON-LD `<script type="application/ld+json">` blocks rendered by the page (locale-matched content):
  1. `AboutPage` + nested `Organization` (`name: 'Local Guide'`, `url`, `areaServed: 'Rhodes, Greece'`, `logo` omitted — none exists).
  2. `FAQPage` whose `mainEntity` mirrors exactly the 6 visible Q&As in the active locale.
- JSON-LD data comes from the same constants that render the visible FAQ (single source of truth — no drift).

## Accessibility & performance

- Heading hierarchy h1 → h2 per section → h3 in cards; `<main>` landmark retained.
- Bilingual `alt` on content photos; decorative overlays `aria-hidden`.
- `priority` only on the hero image; all others lazy. Explicit `sizes` on every `next/image`.
- Reduced motion respected via existing `PageMotion`; `<details>` FAQ works with keyboard/screen readers natively.
- Mobile: no horizontal overflow at 375px (existing regression tests must stay green).

## Testing

Existing 6 e2e tests pass unchanged (same h1, same nav links, same mobile fit). New tests in `tests/e2e/about-page.spec.ts`:
- Hero image visible on `/en/about`.
- FAQ: answer text present in DOM before interaction; a `<details>` toggles open on click.
- Both JSON-LD scripts parse as valid JSON with `@type` `AboutPage`/`FAQPage`, and FAQPage has 6 questions.
- Localized metadata: `<link rel="alternate" hreflang="en">` and canonical present.

## Out of scope

- Live stats from the database.
- Site-wide fixes (language switcher losing page context) — separate follow-up.
- Any change to homepage, header, or footer beyond what already shipped.

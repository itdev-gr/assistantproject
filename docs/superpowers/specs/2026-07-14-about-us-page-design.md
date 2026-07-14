# About Us Page — Design

**Date:** 2026-07-14 · **Status:** approved

## Why

The public directory ("Local Guide") has no page telling visitors who is behind it or why it can be trusted. The homepage has a short "What we do" strip (`AboutSection`), but nothing deeper, and nothing reachable from the menu. We are adding a dedicated About Us page and linking it from the site header and footer.

## Scope decision

User decision: **story + mission, no team.** Copy is drafted by us in both English and Greek (the site's inline `t(en, el)` bilingual pattern). No team names/photos, no company registry details, no CMS. The existing homepage `AboutSection` stays where it is.

## Route & navigation

- New page: `apps/web/src/app/[locale]/about/page.tsx`. With `localePrefix: 'as-needed'` and default locale `el`, the URLs are `/about` (Greek) and `/en/about` (English). Links use `Link` from `@/i18n/routing`, which handles prefixing.
- `SiteHeader`: add an "About" / "Σχετικά" link between "Browse" and the language switcher. Unlike "Browse" (hidden below `sm`), the About link stays visible at all breakpoints — it is the page's only discovery point.
- `SiteFooter`: add the same link to the "Explore" column, above the category buttons.

## Page structure

Server component mirroring `[locale]/page.tsx`: `setRequestLocale`, `PageMotion` wrapper, `SiteHeader` (sticky non-overlay variant — no hero image), content sections, `SiteFooter` (no `categories` prop; the footer's existing empty-state fallback covers it).

Content sections (all copy bilingual, reusing `fadeUp`/`stagger` motion variants and the card styling of `AboutSection`):

1. **Story headline** — a local guide built on the island, connecting visitors with trusted local businesses.
2. **Mission** — honest recommendations, no paid clutter, every referral supports the local community.
3. **How it works** — three audience cards: visitors browse curated places; hotels embed the AI guest assistant; businesses receive direct referrals with no middlemen.
4. **Closing CTA** — links to the directory (`/`) and to `/login` ("List your business").

New components live in `apps/web/src/components/public/` following existing naming (client components only where motion requires it).

## Metadata & SEO

`generateMetadata` on the page with localized title ("About us — Local Guide" / "Σχετικά με εμάς — Τοπικός Οδηγός") and a one-sentence localized description. Note: no page currently sets its own metadata (only a static default in the root layout), so this is the first page-level `generateMetadata` — a deliberate, self-contained addition, not an existing pattern.

## Testing

Playwright e2e in `tests/e2e/` (existing conventions): `/about` and `/en/about` render the header and story headline; the header About link navigates from the homepage; the footer link is present. No auth needed — public pages only.

## Out of scope

- Team/company details, contact form, CMS-editable content.
- Any change to the homepage `AboutSection`.

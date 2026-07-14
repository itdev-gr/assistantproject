# About Us Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual About Us page at `/about` (Greek) / `/en/about` (English) to the public site and link it from the header and footer menus.

**Architecture:** One new server-component route (`[locale]/about/page.tsx`) composed with the existing `SiteHeader` / `SiteFooter`, plus one new client component (`AboutContent`) holding all page copy inline with the site's `t(en, el)` bilingual pattern. Two small edits add the menu links.

**Tech Stack:** Next.js App Router, next-intl (`localePrefix: 'as-needed'`, default `el`), framer-motion, Tailwind, `@aga/ui` Button, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-07-14-about-us-page-design.md`

## Global Constraints

- All user-facing copy is bilingual via the inline helper `const t = (en: string, el: string) => (locale === 'en' ? en : el);` — never next-intl message catalogs (the public components do not use them).
- Internal links use `Link` from `@/i18n/routing` (handles locale prefixing: `/about` for Greek, `/en/about` for English).
- Match existing formatting: single quotes, trailing commas, 2-space indent.
- No new dependencies.
- The homepage `AboutSection` is untouched.
- Playwright runs against a dev server on `http://localhost:3000`. Start it if not running: `pnpm --filter @aga/web dev` (run in background). Always target the single test file — running the whole e2e suite fails at import time because `tests/e2e/booking-pipeline.spec.ts` throws without `AGA_E2E_OWNER_EMAIL`/`AGA_E2E_OWNER_PASSWORD` env vars.

---

### Task 1: About page route and content

**Files:**
- Create: `apps/web/src/components/public/AboutContent.tsx`
- Create: `apps/web/src/app/[locale]/about/page.tsx`
- Test: `tests/e2e/about-page.spec.ts`

**Interfaces:**
- Consumes: `SiteHeader({ locale })`, `SiteFooter({ locale })`, `PageMotion`, `Reveal`, `fadeUp`, `stagger` from `@/components/public/motion`, `Link` from `@/i18n/routing`, `Button` from `@aga/ui`.
- Produces: route `GET /about` (el) and `GET /en/about` (en); component `AboutContent({ locale }: { locale: string })`. Task 2's tests rely on the page's `h1` matching `/Built on the island/` (en).

- [ ] **Step 1: Write the failing e2e test**

Create `tests/e2e/about-page.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('about page', () => {
  test('renders the story in English', async ({ page }) => {
    await page.goto('/en/about');
    await expect(
      page.getByRole('heading', { level: 1, name: /Built on the island/ }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    // Scoped to main: the footer also has a 'List your business' link, and an
    // unscoped locator matching two elements is a Playwright strict-mode error.
    await expect(
      page.getByRole('main').getByRole('link', { name: 'List your business' }),
    ).toBeVisible();
  });

  test('renders the story in Greek at the unprefixed URL', async ({ page }) => {
    await page.goto('/about');
    await expect(
      page.getByRole('heading', { level: 1, name: /Φτιαγμένο στο νησί/ }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

If no dev server is running on port 3000, start one in the background first:

```bash
pnpm --filter @aga/web dev
```

Then:

```bash
pnpm exec playwright test tests/e2e/about-page.spec.ts
```

Expected: 2 FAILED — the route 404s, so the level-1 heading is never visible (timeout waiting for `getByRole('heading', ...)`).

- [ ] **Step 3: Create the content component**

Create `apps/web/src/components/public/AboutContent.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import { Compass, MessageCircleHeart, Store, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { fadeUp, stagger, Reveal } from './motion';

interface Props {
  locale: string;
}

interface Audience {
  icon: LucideIcon;
  titleEn: string;
  titleEl: string;
  bodyEn: string;
  bodyEl: string;
}

const AUDIENCES: Audience[] = [
  {
    icon: Compass,
    titleEn: 'For visitors',
    titleEl: 'Για τους επισκέπτες',
    bodyEn:
      'Browse hand-picked restaurants, beaches, activities and trusted services — every place is checked by locals before it appears here.',
    bodyEl:
      'Εξερευνήστε επιλεγμένα εστιατόρια, παραλίες, δραστηριότητες και αξιόπιστες υπηρεσίες — κάθε μέρος ελέγχεται από ντόπιους πριν εμφανιστεί εδώ.',
  },
  {
    icon: MessageCircleHeart,
    titleEn: 'For hotels',
    titleEl: 'Για τα ξενοδοχεία',
    bodyEn:
      'Embed our AI guest assistant and let guests ask in their own words — they get instant, honest local recommendations around the clock.',
    bodyEl:
      'Ενσωματώστε τον AI βοηθό επισκεπτών και αφήστε τους επισκέπτες να ρωτούν με δικά τους λόγια — λαμβάνουν άμεσες, ειλικρινείς τοπικές προτάσεις όλο το εικοσιτετράωρο.',
  },
  {
    icon: Store,
    titleEn: 'For local businesses',
    titleEl: 'Για τις τοπικές επιχειρήσεις',
    bodyEn:
      'Reach the right visitors at the right moment and connect with them directly — no middlemen between you and your guests.',
    bodyEl:
      'Προσεγγίστε τους κατάλληλους επισκέπτες την κατάλληλη στιγμή και επικοινωνήστε μαζί τους άμεσα — χωρίς μεσάζοντες ανάμεσα σε εσάς και τους πελάτες σας.',
  },
];

export function AboutContent({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <main className="flex-1">
      <section className="border-b bg-background">
        <motion.div
          className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={fadeUp}
            className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary"
          >
            {t('About us', 'Σχετικά με εμάς')}
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif text-4xl font-semibold sm:text-5xl"
          >
            {t('Built on the island, for the island.', 'Φτιαγμένο στο νησί, για το νησί.')}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 text-base text-muted-foreground sm:text-lg">
            {t(
              'Local Guide started with a simple idea: visitors deserve honest recommendations, and the best local businesses deserve to be found. We connect the two — directly, with no paid clutter.',
              'Ο Τοπικός Οδηγός ξεκίνησε από μια απλή ιδέα: οι επισκέπτες αξίζουν ειλικρινείς προτάσεις και οι καλύτερες τοπικές επιχειρήσεις αξίζουν να βρίσκονται. Εμείς τους ενώνουμε — άμεσα, χωρίς πληρωμένο θόρυβο.',
            )}
          </motion.p>
        </motion.div>
      </section>

      <section className="border-b bg-background">
        <Reveal className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <motion.h2 variants={fadeUp} className="font-serif text-3xl font-semibold sm:text-4xl">
            {t('Our mission', 'Η αποστολή μας')}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t(
              'Tourism should strengthen the place it happens in. Every recommendation here is hand-picked by people who live on the island, every visit supports a real local business, and every hotel that joins gives its guests something genuinely useful — not another ad space.',
              'Ο τουρισμός πρέπει να δυναμώνει τον τόπο όπου συμβαίνει. Κάθε πρόταση εδώ επιλέγεται από ανθρώπους που ζουν στο νησί, κάθε επίσκεψη στηρίζει μια πραγματική τοπική επιχείρηση και κάθε ξενοδοχείο που συμμετέχει προσφέρει στους επισκέπτες του κάτι πραγματικά χρήσιμο — όχι ακόμη έναν διαφημιστικό χώρο.',
            )}
          </motion.p>
        </Reveal>
      </section>

      <section className="border-b bg-background">
        <Reveal className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <motion.h2
            variants={fadeUp}
            className="text-center font-serif text-3xl font-semibold sm:text-4xl"
          >
            {t('How it works', 'Πώς λειτουργεί')}
          </motion.h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <motion.li
                key={a.titleEn}
                variants={fadeUp}
                className="rounded-xl border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <a.icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <h3 className="text-base font-semibold">{t(a.titleEn, a.titleEl)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(a.bodyEn, a.bodyEl)}
                </p>
              </motion.li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="bg-background">
        <Reveal className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <motion.h2 variants={fadeUp} className="font-serif text-3xl font-semibold sm:text-4xl">
            {t('Ready to explore?', 'Έτοιμοι για εξερεύνηση;')}
          </motion.h2>
          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild>
              <Link href="/">{t('Browse places', 'Δείτε τα μέρη')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">
                {t('List your business', 'Καταχωρίστε την επιχείρησή σας')}
              </Link>
            </Button>
          </motion.div>
        </Reveal>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Create the route**

Create `apps/web/src/app/[locale]/about/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/public/SiteHeader';
import { AboutContent } from '@/components/public/AboutContent';
import { SiteFooter } from '@/components/public/SiteFooter';
import { PageMotion } from '@/components/public/motion';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'en'
    ? {
        title: 'About us — Local Guide',
        description:
          'Who we are and why we built Local Guide: honest, hand-picked recommendations connecting island visitors with trusted local businesses.',
      }
    : {
        title: 'Σχετικά με εμάς — Τοπικός Οδηγός',
        description:
          'Ποιοι είμαστε και γιατί φτιάξαμε τον Τοπικό Οδηγό: ειλικρινείς, επιλεγμένες προτάσεις που συνδέουν τους επισκέπτες του νησιού με αξιόπιστες τοπικές επιχειρήσεις.',
      };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageMotion>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader locale={locale} />
        <AboutContent locale={locale} />
        <SiteFooter locale={locale} />
      </div>
    </PageMotion>
  );
}
```

Note: no `overlay` prop on `SiteHeader` — the page has no hero image, so the header uses its sticky solid variant. No `categories` prop on `SiteFooter` — its empty-state fallback ("Browse all places") covers this.

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm exec playwright test tests/e2e/about-page.spec.ts
```

Expected: 2 passed.

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @aga/web typecheck
```

Expected: exits 0, no output.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/about-page.spec.ts apps/web/src/components/public/AboutContent.tsx 'apps/web/src/app/[locale]/about/page.tsx'
git commit -m "Add bilingual About Us page at /about"
```

---

### Task 2: Header and footer menu links

**Files:**
- Modify: `apps/web/src/components/public/SiteHeader.tsx:46-57` (nav, after the Browse link)
- Modify: `apps/web/src/components/public/SiteFooter.tsx:1-10` (imports) and `:45-52` (Explore column, before the category buttons)
- Test: `tests/e2e/about-page.spec.ts` (append)

**Interfaces:**
- Consumes: route `/en/about` and the `h1` matching `/Built on the island/` from Task 1; `Link` from `@/i18n/routing`.
- Produces: header nav link labeled `About` / `Σχετικά` (all breakpoints); footer Explore-column link labeled `About us` / `Σχετικά με εμάς`.

- [ ] **Step 1: Append the failing navigation tests**

Append to `tests/e2e/about-page.spec.ts`:

```ts
test.describe('about page navigation', () => {
  test('header menu link navigates to the about page', async ({ page }) => {
    await page.goto('/en');
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'About', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Built on the island/ }),
    ).toBeVisible();
  });

  test('footer contains the about link', async ({ page }) => {
    await page.goto('/en');
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'About us' }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

```bash
pnpm exec playwright test tests/e2e/about-page.spec.ts
```

Expected: 2 passed (Task 1 tests), 2 failed — timeout finding `link, { name: 'About' }` in the header nav and `link, { name: 'About us' }` in the footer.

- [ ] **Step 3: Add the header link**

In `apps/web/src/components/public/SiteHeader.tsx`, directly after the Browse `<Link ...>...</Link>` element (currently lines 47–57) and before the `<a href={`/${otherLocale}`}` language switcher, insert:

```tsx
          <Link
            href="/about"
            className={cn(
              'rounded-md px-3 py-2 transition-colors duration-200',
              transparent
                ? 'text-white/80 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {locale === 'en' ? 'About' : 'Σχετικά'}
          </Link>
```

Unlike the Browse link, there is no `hidden ... sm:block` class — the About link stays visible at all breakpoints (spec: it is the page's only discovery point).

- [ ] **Step 4: Add the footer link**

In `apps/web/src/components/public/SiteFooter.tsx`:

1. Add the import after the existing `lucide-react` import (line 4):

```tsx
import { Link } from '@/i18n/routing';
```

2. In the "Explore" column's `<ul>` (currently starting line 49), insert as the FIRST `<li>`, before the `{categories.slice(0, 5).map(...)}` block:

```tsx
              <li>
                <Link
                  href="/about"
                  className="text-sky-200/80 transition-colors duration-200 hover:text-white"
                >
                  {t('About us', 'Σχετικά με εμάς')}
                </Link>
              </li>
```

- [ ] **Step 5: Run all about tests to verify they pass**

```bash
pnpm exec playwright test tests/e2e/about-page.spec.ts
```

Expected: 4 passed.

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @aga/web typecheck
```

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/about-page.spec.ts apps/web/src/components/public/SiteHeader.tsx apps/web/src/components/public/SiteFooter.tsx
git commit -m "Link About Us page from header and footer menus"
```

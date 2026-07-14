# About Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain About page with an image-rich editorial page (photo hero, two-column story, values grid, photo mosaic, numbered how-it-works, FAQ accordion, CTA band) and a full SEO layer (hreflang/canonical, OpenGraph/Twitter, AboutPage + FAQPage JSON-LD).

**Architecture:** The single `AboutContent.tsx` is deleted and replaced by seven focused section components under `apps/web/src/components/public/about/`; the route file composes them and owns all SEO. FAQ copy lives in one constants file consumed by both the visible accordion and the FAQPage JSON-LD, so they can never drift.

**Tech Stack:** Next.js App Router, next-intl (`localePrefix: 'as-needed'`, default `el`), framer-motion, Tailwind, `@aga/ui` Button, next/image, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-07-14-about-page-redesign-design.md`

## Global Constraints

- All user-facing copy bilingual via the inline helper `const t = (en: string, el: string) => (locale === 'en' ? en : el);` — never next-intl message catalogs.
- Internal links use `Link` from `@/i18n/routing`.
- The h1 copy stays exactly `Built on the island, for the island.` / `Φτιαγμένο στο νησί, για το νησί.` — existing e2e tests match `/Built on the island/` and `/Φτιαγμένο στο νησί/`.
- The `How it works` h2 and the `List your business` CTA link inside `<main>` must keep existing (they are asserted by existing tests).
- Match existing formatting: single quotes, trailing commas, 2-space indent, printWidth 100.
- No new npm dependencies. No database access — the page stays fully static.
- The homepage, `SiteHeader`, and `SiteFooter` are NOT modified in this plan.
- All 6 existing tests in `tests/e2e/about-page.spec.ts` must pass unchanged at the end of every task.
- Playwright: always target the single test file (the other spec throws without credentials env vars). The dev-server port and `AGA_BASE_URL` are provided by the controller at dispatch time.

---

### Task 1: Section components, images, and page composition

**Files:**
- Create: `apps/web/public/images/about-hero.jpg`, `about-harbor.jpg`, `about-taverna.jpg`, `about-beach.jpg`, `about-village.jpg` (downloads)
- Modify: `apps/web/public/images/ATTRIBUTION.txt` (append 5 lines)
- Create: `apps/web/src/components/public/about/faq-data.ts`
- Create: `apps/web/src/components/public/about/AboutHero.tsx`
- Create: `apps/web/src/components/public/about/AboutStory.tsx`
- Create: `apps/web/src/components/public/about/ValuesGrid.tsx`
- Create: `apps/web/src/components/public/about/PhotoMosaic.tsx`
- Create: `apps/web/src/components/public/about/HowItWorks.tsx`
- Create: `apps/web/src/components/public/about/AboutFaq.tsx`
- Create: `apps/web/src/components/public/about/AboutCta.tsx`
- Modify: `apps/web/src/app/[locale]/about/page.tsx` (recompose; keep current `generateMetadata` untouched in this task)
- Delete: `apps/web/src/components/public/AboutContent.tsx`
- Test: `tests/e2e/about-page.spec.ts` (append one describe block)

**Interfaces:**
- Consumes: `fadeUp`, `stagger` from `@/components/public/motion` (existing); `SiteHeader({ locale, overlay })`, `SiteFooter({ locale })`, `PageMotion` (existing); `Button` from `@aga/ui`; `Link` from `@/i18n/routing`.
- Produces: `FAQ_ITEMS: FaqItem[]` and `interface FaqItem { qEn: string; qEl: string; aEn: string; aEl: string }` exported from `apps/web/src/components/public/about/faq-data.ts` — Task 2's JSON-LD imports these. Every section component has signature `({ locale }: { locale: string })`. The page keeps `<main>` from `AboutHero`'s sibling wrapper (see page code).

- [ ] **Step 1: Write the failing e2e tests**

Append to `tests/e2e/about-page.spec.ts`:

```ts
test.describe('about page redesign', () => {
  test('hero image and new sections render', async ({ page }) => {
    await page.goto('/en/about');
    await expect(page.locator('img[src*="about-hero"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Our story' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What we stand by' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Questions, answered' }),
    ).toBeVisible();
  });

  test('FAQ answers are in the DOM before interaction and toggle open', async ({ page }) => {
    await page.goto('/en/about');
    const firstAnswer = page.getByText(
      'Yes — browsing the guide and the recommendations are completely free',
    );
    // Present in the DOM for crawlers even while collapsed.
    await expect(firstAnswer).toBeAttached();
    const firstQuestion = page.getByText('Is the guide free for visitors?');
    await firstQuestion.click();
    await expect(firstAnswer).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `AGA_BASE_URL=<controller-provided> pnpm exec playwright test tests/e2e/about-page.spec.ts`
Expected: 6 passed (existing), 2 failed (new) — `about-hero` image and new headings don't exist yet.

- [ ] **Step 3: Download the images and record attribution**

```bash
cd apps/web/public/images
curl -sL -o about-hero.jpg 'https://images.unsplash.com/photo-1596023398262-0d08606c9905?w=1800&q=65&fm=jpg&fit=crop'
curl -sL -o about-harbor.jpg 'https://images.unsplash.com/photo-1698648144908-5186661843d9?w=1200&q=70&fm=jpg&fit=crop'
curl -sL -o about-taverna.jpg 'https://images.unsplash.com/photo-1550293750-dde2bed30d54?w=1200&q=70&fm=jpg&fit=crop'
curl -sL -o about-beach.jpg 'https://images.unsplash.com/photo-1697753977033-2331932713c7?w=1200&q=70&fm=jpg&fit=crop'
curl -sL -o about-village.jpg 'https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1200&q=70&fm=jpg&fit=crop'
file about-*.jpg && ls -la about-*.jpg
cd -
```

Verify: `file` reports JPEG for all 5; each file is >30KB (not an error page) and ≤450KB (hero) / ≤350KB (others). If a size exceeds the cap, re-download with `q=` lowered by 10. If a URL 404s, pick a same-subject free Unsplash photo and note the substitution in ATTRIBUTION.txt.

Append to `apps/web/public/images/ATTRIBUTION.txt` (keep the existing entry's format):

```
about-hero.jpg — Photo by Dimitris Kiriakakis on Unsplash — https://unsplash.com/photos/ETj9Kql-A6A
about-harbor.jpg — Photo by Tatiana Tochilova on Unsplash — https://unsplash.com/photos/7pMnZHGowiU
about-taverna.jpg — Photo by Ricardo Jimenez on Unsplash — https://unsplash.com/photos/Kzft6vrwRoM
about-beach.jpg — Photo by Dimitris Kiriakakis on Unsplash — https://unsplash.com/photos/ttUKl-qQWC4
about-village.jpg — Photo by Johnny Africa on Unsplash — https://unsplash.com/photos/qvdGgOwgw1Q
```

- [ ] **Step 4: Create the FAQ data module**

Create `apps/web/src/components/public/about/faq-data.ts`:

```ts
export interface FaqItem {
  qEn: string;
  qEl: string;
  aEn: string;
  aEl: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    qEn: 'Is the guide free for visitors?',
    qEl: 'Είναι ο οδηγός δωρεάν για τους επισκέπτες;',
    aEn:
      'Yes — browsing the guide and the recommendations are completely free for visitors. You pay the businesses directly for whatever you book or order, with no markups and no booking fees.',
    aEl:
      'Ναι — η περιήγηση στον οδηγό και οι προτάσεις είναι εντελώς δωρεάν για τους επισκέπτες. Πληρώνετε απευθείας τις επιχειρήσεις για ό,τι κλείσετε ή παραγγείλετε, χωρίς προσαυξήσεις και χρεώσεις κράτησης.',
  },
  {
    qEn: 'How are the places chosen?',
    qEl: 'Πώς επιλέγονται τα μέρη;',
    aEn:
      'Every listing is hand-picked and checked by people who live on the island. We visit, we ask around, and we only include places we would honestly recommend to friends.',
    aEl:
      'Κάθε καταχώριση επιλέγεται και ελέγχεται από ανθρώπους που ζουν στο νησί. Επισκεπτόμαστε, ρωτάμε, και συμπεριλαμβάνουμε μόνο μέρη που θα προτείναμε ειλικρινά σε φίλους.',
  },
  {
    qEn: 'Do businesses pay to rank higher?',
    qEl: 'Πληρώνουν οι επιχειρήσεις για να εμφανίζονται ψηλότερα;',
    aEn:
      'No. Placement tiers exist for visibility features, but they never change which places we include or what we say about them. Curation and ranking integrity always come first.',
    aEl:
      'Όχι. Υπάρχουν βαθμίδες προβολής για επιπλέον δυνατότητες, αλλά δεν αλλάζουν ποτέ ποια μέρη συμπεριλαμβάνουμε ή τι λέμε για αυτά. Η ακεραιότητα της επιμέλειας προηγείται πάντα.',
  },
  {
    qEn: 'How does my business get listed?',
    qEl: 'Πώς μπορεί να καταχωριστεί η επιχείρησή μου;',
    aEn:
      'Reach out through the “List your business” link below. If your place fits the guide — quality, honesty, and a genuine local footprint — we will visit and take it from there.',
    aEl:
      'Επικοινωνήστε μέσω του συνδέσμου «Καταχωρίστε την επιχείρησή σας» παρακάτω. Αν το μέρος σας ταιριάζει στον οδηγό — ποιότητα, ειλικρίνεια και πραγματικό τοπικό αποτύπωμα — θα σας επισκεφθούμε και θα τα πούμε από κοντά.',
  },
  {
    qEn: 'What is the AI guest assistant for hotels?',
    qEl: 'Τι είναι ο AI βοηθός επισκεπτών για ξενοδοχεία;',
    aEn:
      'Hotels embed our assistant so their guests can ask in their own words — “where can we eat fresh fish nearby?” — and instantly get curated local recommendations, day and night.',
    aEl:
      'Τα ξενοδοχεία ενσωματώνουν τον βοηθό μας ώστε οι επισκέπτες τους να ρωτούν με δικά τους λόγια — «πού να φάμε φρέσκο ψάρι κοντά;» — και να λαμβάνουν άμεσα επιλεγμένες τοπικές προτάσεις, μέρα και νύχτα.',
  },
  {
    qEn: 'Which areas do you cover?',
    qEl: 'Ποιες περιοχές καλύπτετε;',
    aEn:
      'We cover Rhodes island-wide — from the old town and the east-coast beaches to the villages and coves of the south — and we keep adding places as locals put them forward.',
    aEl:
      'Καλύπτουμε όλη τη Ρόδο — από την παλιά πόλη και τις παραλίες της ανατολικής ακτής μέχρι τα χωριά και τους κολπίσκους του νότου — και προσθέτουμε συνεχώς νέα μέρη με προτάσεις ντόπιων.',
  },
];
```

- [ ] **Step 5: Create AboutHero**

Create `apps/web/src/components/public/about/AboutHero.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fadeUp, stagger } from '../motion';

interface Props {
  locale: string;
}

export function AboutHero({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[62svh] flex-col overflow-hidden md:min-h-[70svh]"
    >
      <motion.div className="absolute inset-0" style={{ y: imageY }} aria-hidden>
        <Image
          src="/images/about-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-105 object-cover object-center"
        />
      </motion.div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-sky-950/70 via-sky-950/40 to-sky-950/75"
        aria-hidden
      />
      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-20 pt-28 text-center"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-sky-100/90"
        >
          {t('About us', 'Σχετικά με εμάς')}
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl"
        >
          {t('Built on the island, for the island.', 'Φτιαγμένο στο νησί, για το νησί.')}
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-base text-sky-50/90 sm:text-lg">
          {t(
            'The story behind the guide that connects visitors with the people who know Rhodes best.',
            'Η ιστορία πίσω από τον οδηγό που συνδέει τους επισκέπτες με τους ανθρώπους που ξέρουν καλύτερα τη Ρόδο.',
          )}
        </motion.p>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 6: Create AboutStory**

Create `apps/web/src/components/public/about/AboutStory.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeUp, Reveal } from '../motion';

interface Props {
  locale: string;
}

export function AboutStory({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-b bg-background">
      <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <motion.h2 variants={fadeUp} className="font-serif text-3xl font-semibold sm:text-4xl">
            {t('Our story', 'Η ιστορία μας')}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t(
              'Local Guide started with a simple idea: visitors deserve honest recommendations, and the best local businesses deserve to be found. Menus change, owners change, seasons change — so instead of copying lists from the internet, we walk the harbours, eat at the tavernas and talk to the people behind the counter.',
              'Ο Τοπικός Οδηγός ξεκίνησε από μια απλή ιδέα: οι επισκέπτες αξίζουν ειλικρινείς προτάσεις και οι καλύτερες τοπικές επιχειρήσεις αξίζουν να βρίσκονται. Τα μενού αλλάζουν, οι ιδιοκτήτες αλλάζουν, οι εποχές αλλάζουν — γι αυτό, αντί να αντιγράφουμε λίστες από το διαδίκτυο, περπατάμε στα λιμάνια, τρώμε στις ταβέρνες και μιλάμε με τους ανθρώπους πίσω από τον πάγκο.',
            )}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-10 font-serif text-3xl font-semibold sm:text-4xl"
          >
            {t('Our mission', 'Η αποστολή μας')}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t(
              'Tourism should strengthen the place it happens in. Every recommendation here is hand-picked by people who live on the island, every visit supports a real local business, and every hotel that joins gives its guests something genuinely useful — not another ad space.',
              'Ο τουρισμός πρέπει να δυναμώνει τον τόπο όπου συμβαίνει. Κάθε πρόταση εδώ επιλέγεται από ανθρώπους που ζουν στο νησί, κάθε επίσκεψη στηρίζει μια πραγματική τοπική επιχείρηση και κάθε ξενοδοχείο που συμμετέχει προσφέρει στους επισκέπτες του κάτι πραγματικά χρήσιμο — όχι ακόμη έναν διαφημιστικό χώρο.',
            )}
          </motion.p>
        </div>
        <motion.div
          variants={fadeUp}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-lg md:aspect-[3/4]"
        >
          <Image
            src="/images/about-harbor.jpg"
            alt={t('Boats moored in a Rhodes harbour', 'Σκάφη αραγμένα σε λιμάνι της Ρόδου')}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </motion.div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 7: Create ValuesGrid**

Create `apps/web/src/components/public/about/ValuesGrid.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import { BadgeCheck, HeartHandshake, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react';
import { fadeUp, Reveal } from '../motion';

interface Props {
  locale: string;
}

interface Value {
  icon: LucideIcon;
  titleEn: string;
  titleEl: string;
  bodyEn: string;
  bodyEl: string;
}

const VALUES: Value[] = [
  {
    icon: ShieldCheck,
    titleEn: 'No paid rankings',
    titleEl: 'Χωρίς πληρωμένες κατατάξεις',
    bodyEn: 'Nobody can buy their way into the guide or above anyone else. What we recommend is what we believe.',
    bodyEl: 'Κανείς δεν μπορεί να αγοράσει θέση στον οδηγό ή πάνω από άλλους. Ό,τι προτείνουμε είναι ό,τι πιστεύουμε.',
  },
  {
    icon: MapPin,
    titleEn: 'Picked by locals',
    titleEl: 'Επιλεγμένα από ντόπιους',
    bodyEn: 'Every place is chosen by people who live here year-round — not by an algorithm or a tourist-season pop-up.',
    bodyEl: 'Κάθε μέρος επιλέγεται από ανθρώπους που ζουν εδώ όλο τον χρόνο — όχι από αλγόριθμο ή εποχικό πέρασμα.',
  },
  {
    icon: BadgeCheck,
    titleEn: 'Verified and current',
    titleEl: 'Επαληθευμένα και ενημερωμένα',
    bodyEn: 'Phones, hours and locations are checked so you never chase a closed door or a dead number.',
    bodyEl: 'Τηλέφωνα, ωράρια και τοποθεσίες ελέγχονται ώστε να μην κυνηγάτε ποτέ κλειστή πόρτα ή νεκρό νούμερο.',
  },
  {
    icon: HeartHandshake,
    titleEn: 'The community wins',
    titleEl: 'Κερδίζει η κοινότητα',
    bodyEn: 'Direct contact, no middlemen: every visit and every booking stays with the island’s own businesses.',
    bodyEl: 'Άμεση επαφή, χωρίς μεσάζοντες: κάθε επίσκεψη και κάθε κράτηση μένει στις επιχειρήσεις του νησιού.',
  },
];

export function ValuesGrid({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-b bg-background">
      <Reveal className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <motion.h2
          variants={fadeUp}
          className="text-center font-serif text-3xl font-semibold sm:text-4xl"
        >
          {t('What we stand by', 'Τι υποστηρίζουμε')}
        </motion.h2>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <motion.li
              key={value.titleEn}
              variants={fadeUp}
              className="rounded-xl border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <value.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h3 className="text-base font-semibold">{t(value.titleEn, value.titleEl)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(value.bodyEn, value.bodyEl)}
              </p>
            </motion.li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 8: Create PhotoMosaic (server component — no 'use client')**

Create `apps/web/src/components/public/about/PhotoMosaic.tsx`:

```tsx
import Image from 'next/image';

interface Props {
  locale: string;
}

interface Photo {
  src: string;
  altEn: string;
  altEl: string;
  className: string;
  sizes: string;
}

const PHOTOS: Photo[] = [
  {
    src: '/images/about-taverna.jpg',
    altEn: 'Taverna table set by the sea',
    altEl: 'Στρωμένο τραπέζι ταβέρνας δίπλα στη θάλασσα',
    className: 'col-span-2 row-span-2',
    sizes: '(min-width: 768px) 50vw, 100vw',
  },
  {
    src: '/images/about-beach.jpg',
    altEn: 'Quiet beach cove with clear Aegean water',
    altEl: 'Ήσυχος κολπίσκος με καθαρά νερά του Αιγαίου',
    className: 'col-span-2 md:col-span-2 md:row-span-1',
    sizes: '(min-width: 768px) 50vw, 100vw',
  },
  {
    src: '/images/about-village.jpg',
    altEn: 'Whitewashed village alley on the island',
    altEl: 'Ασβεστωμένο σοκάκι χωριού στο νησί',
    className: 'col-span-2 md:col-span-2 md:row-span-1',
    sizes: '(min-width: 768px) 50vw, 100vw',
  },
];

export function PhotoMosaic({ locale }: Props) {
  return (
    <section className="border-b bg-background" aria-label={locale === 'en' ? 'Island photos' : 'Φωτογραφίες του νησιού'}>
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <ul className="grid auto-rows-[170px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
          {PHOTOS.map((photo) => (
            <li key={photo.src} className={`relative overflow-hidden rounded-2xl ${photo.className}`}>
              <Image
                src={photo.src}
                alt={locale === 'en' ? photo.altEn : photo.altEl}
                fill
                sizes={photo.sizes}
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 9: Create HowItWorks**

Create `apps/web/src/components/public/about/HowItWorks.tsx` (same three audiences as the old `AboutContent`, restyled with step numbers):

```tsx
'use client';

import { motion } from 'framer-motion';
import { Compass, MessageCircleHeart, Store, type LucideIcon } from 'lucide-react';
import { fadeUp, Reveal } from '../motion';

interface Props {
  locale: string;
}

interface Audience {
  icon: LucideIcon;
  step: string;
  titleEn: string;
  titleEl: string;
  bodyEn: string;
  bodyEl: string;
}

const AUDIENCES: Audience[] = [
  {
    icon: Compass,
    step: '01',
    titleEn: 'For visitors',
    titleEl: 'Για τους επισκέπτες',
    bodyEn:
      'Browse hand-picked restaurants, beaches, activities and trusted services — every place is checked by locals before it appears here.',
    bodyEl:
      'Εξερευνήστε επιλεγμένα εστιατόρια, παραλίες, δραστηριότητες και αξιόπιστες υπηρεσίες — κάθε μέρος ελέγχεται από ντόπιους πριν εμφανιστεί εδώ.',
  },
  {
    icon: MessageCircleHeart,
    step: '02',
    titleEn: 'For hotels',
    titleEl: 'Για τα ξενοδοχεία',
    bodyEn:
      'Embed our AI guest assistant and let guests ask in their own words — they get instant, honest local recommendations around the clock.',
    bodyEl:
      'Ενσωματώστε τον AI βοηθό επισκεπτών και αφήστε τους επισκέπτες να ρωτούν με δικά τους λόγια — λαμβάνουν άμεσες, ειλικρινείς τοπικές προτάσεις όλο το εικοσιτετράωρο.',
  },
  {
    icon: Store,
    step: '03',
    titleEn: 'For local businesses',
    titleEl: 'Για τις τοπικές επιχειρήσεις',
    bodyEn:
      'Reach the right visitors at the right moment and connect with them directly — no middlemen between you and your guests.',
    bodyEl:
      'Προσεγγίστε τους κατάλληλους επισκέπτες την κατάλληλη στιγμή και επικοινωνήστε μαζί τους άμεσα — χωρίς μεσάζοντες ανάμεσα σε εσάς και τους πελάτες σας.',
  },
];

export function HowItWorks({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-b bg-background">
      <Reveal className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <motion.h2
          variants={fadeUp}
          className="text-center font-serif text-3xl font-semibold sm:text-4xl"
        >
          {t('How it works', 'Πώς λειτουργεί')}
        </motion.h2>
        <ul className="mt-12 grid gap-6 sm:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <motion.li
              key={audience.titleEn}
              variants={fadeUp}
              className="relative rounded-xl border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <span
                className="absolute right-5 top-4 font-serif text-4xl font-semibold text-primary/15"
                aria-hidden
              >
                {audience.step}
              </span>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <audience.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h3 className="text-base font-semibold">{t(audience.titleEn, audience.titleEl)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(audience.bodyEn, audience.bodyEl)}
              </p>
            </motion.li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 10: Create AboutFaq (server component — no 'use client')**

Create `apps/web/src/components/public/about/AboutFaq.tsx`:

```tsx
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from './faq-data';

interface Props {
  locale: string;
}

export function AboutFaq({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-b bg-background" id="faq">
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <h2 className="text-center font-serif text-3xl font-semibold sm:text-4xl">
          {t('Questions, answered', 'Ερωτήσεις και απαντήσεις')}
        </h2>
        <div className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.qEn}
              className="group rounded-xl border bg-card px-5 py-4 shadow-sm transition-shadow duration-200 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {t(item.qEn, item.qEl)}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(item.aEn, item.aEl)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 11: Create AboutCta**

Create `apps/web/src/components/public/about/AboutCta.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { fadeUp, Reveal } from '../motion';

interface Props {
  locale: string;
}

export function AboutCta({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="bg-gradient-to-br from-sky-950 to-sky-800 text-white">
      <Reveal className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
        <motion.h2 variants={fadeUp} className="font-serif text-3xl font-semibold sm:text-4xl">
          {t('Ready to explore?', 'Έτοιμοι για εξερεύνηση;')}
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-3 text-base text-sky-100/90">
          {t(
            'Find your next favourite place — or put yours on the map.',
            'Βρείτε το επόμενο αγαπημένο σας μέρος — ή βάλτε το δικό σας στον χάρτη.',
          )}
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="bg-white text-sky-950 hover:bg-sky-100">
            <Link href="/">{t('Browse places', 'Δείτε τα μέρη')}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/login">{t('List your business', 'Καταχωρίστε την επιχείρησή σας')}</Link>
          </Button>
        </motion.div>
      </Reveal>
    </section>
  );
}
```

(`size="lg"` is a real variant — verified in `packages/ui/src/button.tsx:21`: `h-11 px-8`.)

- [ ] **Step 12: Recompose the page and delete AboutContent**

Replace the component imports and JSX of `apps/web/src/app/[locale]/about/page.tsx` — keep the existing `generateMetadata` function EXACTLY as it is (Task 2 replaces it):

```tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { PageMotion } from '@/components/public/motion';
import { AboutHero } from '@/components/public/about/AboutHero';
import { AboutStory } from '@/components/public/about/AboutStory';
import { ValuesGrid } from '@/components/public/about/ValuesGrid';
import { PhotoMosaic } from '@/components/public/about/PhotoMosaic';
import { HowItWorks } from '@/components/public/about/HowItWorks';
import { AboutFaq } from '@/components/public/about/AboutFaq';
import { AboutCta } from '@/components/public/about/AboutCta';

interface Props {
  params: Promise<{ locale: string }>;
}

// ... existing generateMetadata stays here unchanged ...

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageMotion>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader locale={locale} overlay />
        <main className="flex-1">
          <AboutHero locale={locale} />
          <AboutStory locale={locale} />
          <ValuesGrid locale={locale} />
          <PhotoMosaic locale={locale} />
          <HowItWorks locale={locale} />
          <AboutFaq locale={locale} />
          <AboutCta locale={locale} />
        </main>
        <SiteFooter locale={locale} />
      </div>
    </PageMotion>
  );
}
```

Then delete the old component:

```bash
git rm apps/web/src/components/public/AboutContent.tsx
```

- [ ] **Step 13: Run all tests to verify they pass**

Run: `AGA_BASE_URL=<controller-provided> pnpm exec playwright test tests/e2e/about-page.spec.ts`
Expected: 8 passed — the 6 existing (h1 unchanged, `How it works` heading kept, `List your business` in `<main>` kept, header/footer links untouched, both 375px mobile tests) plus the 2 new ones. The mobile tests are the canary for the new hero: if they fail on overflow, find the offending section (likely a fixed-width element) and fix before committing.

- [ ] **Step 14: Typecheck**

Run: `pnpm --filter @aga/web typecheck`
Expected: exit 0.

- [ ] **Step 15: Commit**

```bash
git add apps/web/public/images apps/web/src/components/public/about 'apps/web/src/app/[locale]/about/page.tsx' tests/e2e/about-page.spec.ts
git rm --cached apps/web/src/components/public/AboutContent.tsx 2>/dev/null || true
git commit -m "Redesign About page with photo hero, values, mosaic and FAQ"
```

---

### Task 2: SEO layer — metadata, hreflang, OpenGraph, JSON-LD

**Files:**
- Modify: `apps/web/src/app/layout.tsx:4-7` (add `metadataBase`)
- Modify: `apps/web/.env.example` (document `NEXT_PUBLIC_SITE_URL`)
- Modify: `apps/web/src/app/[locale]/about/page.tsx` (replace `generateMetadata`, add JSON-LD)
- Test: `tests/e2e/about-page.spec.ts` (append one describe block)

**Interfaces:**
- Consumes: `FAQ_ITEMS` and `FaqItem` from `@/components/public/about/faq-data` (created in Task 1: `{ qEn, qEl, aEn, aEl }` string fields).
- Produces: nothing consumed later.

- [ ] **Step 1: Write the failing SEO e2e tests**

Append to `tests/e2e/about-page.spec.ts`:

```ts
test.describe('about page SEO', () => {
  test('has hreflang alternates and canonical', async ({ page }) => {
    await page.goto('/en/about');
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toBeAttached();
    await expect(page.locator('link[rel="alternate"][hreflang="el"]')).toBeAttached();
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toBeAttached();
    await expect(page.locator('link[rel="canonical"]')).toBeAttached();
  });

  test('has OpenGraph image and JSON-LD structured data', async ({ page }) => {
    await page.goto('/en/about');
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toBeAttached();
    expect(await ogImage.getAttribute('content')).toContain('about-hero');

    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const parsed = scripts.map((s) => JSON.parse(s));
    const types = parsed.map((p) => p['@type']);
    expect(types).toContain('AboutPage');
    expect(types).toContain('FAQPage');
    const faq = parsed.find((p) => p['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(6);
    expect(faq.mainEntity[0]['@type']).toBe('Question');
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `AGA_BASE_URL=<controller-provided> pnpm exec playwright test tests/e2e/about-page.spec.ts`
Expected: 8 passed (Task 1), 2 failed (no hreflang links, no JSON-LD scripts yet).

- [ ] **Step 3: Add metadataBase to the root layout**

In `apps/web/src/app/layout.tsx`, the current metadata export is:

```ts
export const metadata: Metadata = {
  title: 'AI Guest Assistant',
  description: 'Curated answers and recommendations for guests of partner hotels.',
};
```

Replace with:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://assistantproject-web.vercel.app'),
  title: 'AI Guest Assistant',
  description: 'Curated answers and recommendations for guests of partner hotels.',
};
```

In `apps/web/.env.example`, append under the existing entries:

```
# Public site origin used for absolute SEO URLs (canonical, hreflang, OpenGraph)
NEXT_PUBLIC_SITE_URL=https://assistantproject-web.vercel.app
```

- [ ] **Step 4: Replace generateMetadata and add JSON-LD to the about page**

In `apps/web/src/app/[locale]/about/page.tsx`, add the import:

```tsx
import { FAQ_ITEMS } from '@/components/public/about/faq-data';
```

Replace the whole `generateMetadata` function with:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const en = locale === 'en';
  const title = en ? 'About us — Local Guide' : 'Σχετικά με εμάς — Τοπικός Οδηγός';
  const description = en
    ? 'Who we are and why we built Local Guide: honest, hand-picked recommendations connecting island visitors with trusted local businesses.'
    : 'Ποιοι είμαστε και γιατί φτιάξαμε τον Τοπικό Οδηγό: ειλικρινείς, επιλεγμένες προτάσεις που συνδέουν τους επισκέπτες του νησιού με αξιόπιστες τοπικές επιχειρήσεις.';

  return {
    title,
    description,
    alternates: {
      canonical: en ? '/en/about' : '/about',
      languages: { el: '/about', en: '/en/about', 'x-default': '/about' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Local Guide',
      locale: en ? 'en_US' : 'el_GR',
      title,
      description,
      images: ['/images/about-hero.jpg'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/images/about-hero.jpg'],
    },
  };
}
```

Inside `AboutPage`, before the `return`, build the JSON-LD (escape `<` to prevent script-context injection):

```tsx
  const en = locale === 'en';
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: en ? 'About us — Local Guide' : 'Σχετικά με εμάς — Τοπικός Οδηγός',
    url: en ? '/en/about' : '/about',
    mainEntity: {
      '@type': 'Organization',
      name: 'Local Guide',
      url: '/',
      areaServed: 'Rhodes, Greece',
    },
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: en ? item.qEn : item.qEl,
      acceptedAnswer: { '@type': 'Answer', text: en ? item.aEn : item.aEl },
    })),
  };
  const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');
```

And render the scripts as the first children inside `<PageMotion>`’s `<div>`:

```tsx
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(aboutJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }}
        />
```

- [ ] **Step 5: Run all tests to verify they pass**

Run: `AGA_BASE_URL=<controller-provided> pnpm exec playwright test tests/e2e/about-page.spec.ts`
Expected: 10 passed.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @aga/web typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/.env.example 'apps/web/src/app/[locale]/about/page.tsx' tests/e2e/about-page.spec.ts
git commit -m "Add SEO layer to About page: hreflang, OpenGraph, JSON-LD"
```

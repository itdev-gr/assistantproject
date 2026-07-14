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

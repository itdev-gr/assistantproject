'use client';

import { motion } from 'framer-motion';
import {
  BadgeCheck,
  MessageCircleHeart,
  PhoneCall,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { fadeUp, stagger } from './motion';

interface Props {
  locale: string;
}

interface Feature {
  icon: LucideIcon;
  titleEn: string;
  titleEl: string;
  bodyEn: string;
  bodyEl: string;
}

const FEATURES: Feature[] = [
  {
    icon: BadgeCheck,
    titleEn: 'Verified & curated',
    titleEl: 'Επαληθευμένα & επιλεγμένα',
    bodyEn:
      'Every business is checked and hand-picked — no paid clutter, only places we would recommend to friends.',
    bodyEl:
      'Κάθε επιχείρηση ελέγχεται και επιλέγεται προσεκτικά — μόνο μέρη που θα προτείναμε σε φίλους.',
  },
  {
    icon: MessageCircleHeart,
    titleEn: 'AI guest assistant',
    titleEl: 'AI βοηθός επισκεπτών',
    bodyEn:
      'Hotel guests ask in their own words — "where can we eat fresh fish nearby?" — and get instant local recommendations.',
    bodyEl:
      'Οι επισκέπτες ρωτούν με δικά τους λόγια — «πού να φάμε φρέσκο ψάρι κοντά;» — και λαμβάνουν άμεσες τοπικές προτάσεις.',
  },
  {
    icon: PhoneCall,
    titleEn: 'Direct contact',
    titleEl: 'Άμεση επικοινωνία',
    bodyEn:
      'Call, WhatsApp or visit — you connect straight with the business, with no middlemen or hidden fees.',
    bodyEl:
      'Τηλέφωνο, WhatsApp ή επίσκεψη — επικοινωνείτε απευθείας με την επιχείρηση, χωρίς μεσάζοντες και κρυφές χρεώσεις.',
  },
  {
    icon: Waves,
    titleEn: 'Local expertise',
    titleEl: 'Τοπική γνώση',
    bodyEn:
      'Built on the island, with the people of the island — hotels, tavernas and skippers who know every cove.',
    bodyEl:
      'Φτιαγμένο στο νησί, με τους ανθρώπους του νησιού — ξενοδοχεία, ταβέρνες και καπετάνιους που ξέρουν κάθε κολπίσκο.',
  },
];

export function AboutSection({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-b bg-background">
      <motion.div
        className="mx-auto max-w-6xl px-4 py-16 md:py-20"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            variants={fadeUp}
            className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary"
          >
            {t('What we do', 'Τι κάνουμε')}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-serif text-3xl font-semibold sm:text-4xl"
          >
            {t(
              'The island, curated by the people who live here.',
              'Το νησί, επιμελημένο από τους ανθρώπους που ζουν εδώ.',
            )}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t(
              'We connect visitors with trusted local businesses. Hotels embed our AI assistant so their guests get instant, honest recommendations — and every referral supports the local community.',
              'Συνδέουμε τους επισκέπτες με αξιόπιστες τοπικές επιχειρήσεις. Τα ξενοδοχεία ενσωματώνουν τον AI βοηθό μας ώστε οι επισκέπτες τους να λαμβάνουν άμεσες, ειλικρινείς προτάσεις — και κάθε σύσταση στηρίζει την τοπική κοινότητα.',
            )}
          </motion.p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <motion.li
              key={f.titleEn}
              variants={fadeUp}
              className="rounded-xl border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h3 className="text-base font-semibold">{t(f.titleEn, f.titleEl)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(f.bodyEn, f.bodyEl)}
              </p>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

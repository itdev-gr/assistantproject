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

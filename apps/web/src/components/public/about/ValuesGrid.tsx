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
    bodyEn:
      'Nobody can buy their way into the guide or above anyone else. What we recommend is what we believe.',
    bodyEl:
      'Κανείς δεν μπορεί να αγοράσει θέση στον οδηγό ή πάνω από άλλους. Ό,τι προτείνουμε είναι ό,τι πιστεύουμε.',
  },
  {
    icon: MapPin,
    titleEn: 'Picked by locals',
    titleEl: 'Επιλεγμένα από ντόπιους',
    bodyEn:
      'Every place is chosen by people who live here year-round — not by an algorithm or a tourist-season pop-up.',
    bodyEl:
      'Κάθε μέρος επιλέγεται από ανθρώπους που ζουν εδώ όλο τον χρόνο — όχι από αλγόριθμο ή εποχικό πέρασμα.',
  },
  {
    icon: BadgeCheck,
    titleEn: 'Verified and current',
    titleEl: 'Επαληθευμένα και ενημερωμένα',
    bodyEn:
      'Phones, hours and locations are checked so you never chase a closed door or a dead number.',
    bodyEl:
      'Τηλέφωνα, ωράρια και τοποθεσίες ελέγχονται ώστε να μην κυνηγάτε ποτέ κλειστή πόρτα ή νεκρό νούμερο.',
  },
  {
    icon: HeartHandshake,
    titleEn: 'The community wins',
    titleEl: 'Κερδίζει η κοινότητα',
    bodyEn:
      "Direct contact, no middlemen: every visit and every booking stays with the island's own businesses.",
    bodyEl:
      'Άμεση επαφή, χωρίς μεσάζοντες: κάθε επίσκεψη και κάθε κράτηση μένει στις επιχειρήσεις του νησιού.',
  },
];

export function ValuesGrid({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="bg-background border-b">
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
              className="bg-card rounded-xl border p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="bg-primary/10 mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full">
                <value.icon className="text-primary h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold">{t(value.titleEn, value.titleEl)}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {t(value.bodyEn, value.bodyEl)}
              </p>
            </motion.li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

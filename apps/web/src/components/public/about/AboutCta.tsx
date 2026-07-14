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

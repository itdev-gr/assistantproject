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
          {t('The island, the way locals know it.', 'Το νησί, όπως το ξέρουν οι ντόπιοι.')}
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-base text-sky-50/90 sm:text-lg">
          {t(
            'We are not another list copied from the internet. We live here, we try things, we ask around, and we hand-pick the tavernas, beaches and people worth knowing — so you can experience the island the way we do.',
            'Δεν είμαστε άλλη μια λίστα αντιγραμμένη από το διαδίκτυο. Ζούμε εδώ, δοκιμάζουμε, ρωτάμε και επιλέγουμε με το χέρι τις ταβέρνες, τις παραλίες και τους ανθρώπους που αξίζει να γνωρίσετε — για να ζήσετε το νησί όπως το ζούμε εμείς.',
          )}
        </motion.p>
      </motion.div>
    </section>
  );
}

'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@aga/ui';
import type { DirectoryCategory } from '@/lib/public-directory';
import {
  useDirectorySearch,
  scrollToDirectory,
} from '@/lib/directory-search-store';
import { fadeUp, stagger } from './motion';

interface Props {
  locale: string;
  totalCount: number;
  categories: DirectoryCategory[];
}

export function HomeHero({ locale, totalCount, categories }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const sectionRef = useRef<HTMLElement>(null);
  const { query, setQuery, setCategory } = useDirectorySearch();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const headline = t('Your local guide to the Aegean', 'Ο τοπικός σας οδηγός στο Αιγαίο');
  const topCategories = categories.slice(0, 4);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    scrollToDirectory();
  }

  function pickCategory(slug: string) {
    setCategory(slug);
    scrollToDirectory();
  }

  function scrollPastHero() {
    sectionRef.current?.nextElementSibling?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[82svh] flex-col overflow-hidden md:min-h-[88svh]"
    >
      {/* Parallax sea photograph */}
      <motion.div className="absolute inset-0" style={{ y: imageY }} aria-hidden>
        <Image
          src="/images/hero-rhodes.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-105 object-cover object-center"
        />
      </motion.div>
      {/* Contrast overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-sky-950/70 via-sky-950/35 to-sky-950/75"
        aria-hidden
      />

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-28 text-center"
        style={{ opacity: contentOpacity }}
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="mb-4 text-xs font-medium uppercase tracking-[0.28em] text-sky-100/90"
        >
          {t('Rhodes · Greece', 'Ρόδος · Ελλάδα')}
        </motion.p>

        <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-tight text-white sm:text-6xl md:text-7xl">
          {headline.split(' ').map((word, i) => (
            <motion.span key={i} variants={fadeUp} className="inline-block">
              {word}
              {i < headline.split(' ').length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </h1>

        <motion.p
          variants={fadeUp}
          className="mt-5 max-w-2xl text-base text-sky-50/90 sm:text-lg"
        >
          {t(
            'Restaurants, beaches, boat trips and trusted local services — hand-picked and verified, all in one place.',
            'Εστιατόρια, παραλίες, εκδρομές με σκάφος και αξιόπιστες τοπικές υπηρεσίες — επιλεγμένα και επαληθευμένα, όλα σε ένα μέρος.',
          )}
        </motion.p>

        {/* Search — the primary CTA */}
        <motion.form
          variants={fadeUp}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          onSubmit={submit}
          role="search"
          className="mt-9 flex w-full max-w-xl items-center gap-2 rounded-full bg-white p-2 shadow-xl shadow-sky-950/30"
        >
          <Search className="ml-3 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'Search tavernas, beaches, boat trips…',
              'Αναζητήστε ταβέρνες, παραλίες, εκδρομές…',
            )}
            aria-label={t('Search businesses', 'Αναζήτηση επιχειρήσεων')}
            className="h-11 w-full min-w-0 bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="h-11 shrink-0 cursor-pointer rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {t('Search', 'Αναζήτηση')}
          </button>
        </motion.form>

        {/* Popular categories */}
        {topCategories.length > 0 && (
          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-xs uppercase tracking-wide text-sky-100/80">
              {t('Popular:', 'Δημοφιλή:')}
            </span>
            {topCategories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => pickCategory(c.slug)}
                className={cn(
                  'cursor-pointer rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm',
                  'transition-colors duration-200 hover:border-white/60 hover:bg-white/20',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                )}
              >
                {c.name}
              </button>
            ))}
          </motion.div>
        )}

        <motion.p variants={fadeUp} className="mt-8 text-sm text-sky-100/80">
          {t(
            `${totalCount} verified businesses, hand-picked.`,
            `${totalCount} εγκεκριμένες επιχειρήσεις, επιλεγμένες με προσοχή.`,
          )}
        </motion.p>
      </motion.div>

      {/* Scroll cue */}
      <motion.button
        type="button"
        onClick={scrollPastHero}
        aria-label={t('Scroll to content', 'Μετάβαση στο περιεχόμενο')}
        className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 cursor-pointer rounded-full p-2 text-white/80 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { delay: 1.2, duration: 0.6 },
          y: { delay: 1.2, duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <ChevronDown className="h-7 w-7" aria-hidden />
      </motion.button>
    </section>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { BadgeCheck, ChevronDown, MapPin, MessageCircle, Search } from 'lucide-react';
import { cn } from '@aga/ui';
import { categoryIcon } from './category-icons';
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

/** Hero backdrop slides — all 2400×1600, see public/images/ATTRIBUTION.txt */
const HERO_SLIDES = [
  { src: '/images/hero-rhodes.jpg', en: 'Lindos, Rhodes', el: 'Λίνδος, Ρόδος' },
  { src: '/images/hero-milos.jpg', en: 'Milos', el: 'Μήλος' },
  { src: '/images/hero-corfu.jpg', en: 'Paleokastritsa, Corfu', el: 'Παλαιοκαστρίτσα, Κέρκυρα' },
  { src: '/images/hero-athens.jpg', en: 'Anafiotika, Athens', el: 'Αναφιώτικα, Αθήνα' },
  { src: '/images/hero-patmos.jpg', en: 'Patmos', el: 'Πάτμος' },
] as const;

const SLIDE_INTERVAL_MS = 6000;

export function HomeHero({ locale, totalCount, categories }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const sectionRef = useRef<HTMLElement>(null);
  const { query, setQuery, setCategory } = useDirectorySearch();
  const reduceMotion = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = HERO_SLIDES[slide] ?? HERO_SLIDES[0];

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = setInterval(
      () => setSlide((i) => (i + 1) % HERO_SLIDES.length),
      SLIDE_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [paused, reduceMotion]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const headline = t('Your local guide for your holidays', 'Ο τοπικός σας οδηγός για τις διακοπές σας');
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
      className="relative flex min-h-[540px] flex-col overflow-hidden md:min-h-[640px]"
    >
      {/* Parallax photo carousel */}
      <motion.div className="absolute inset-0" style={{ y: imageY }} aria-hidden>
        <AnimatePresence initial={false}>
          <motion.div
            key={current.src}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: 'easeInOut' }}
          >
            <Image
              src={current.src}
              alt=""
              fill
              priority={slide === 0}
              sizes="100vw"
              className="scale-105 object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>
        {/* Preload the remaining slides off-screen so the first crossfade is instant */}
        <div className="hidden">
          {HERO_SLIDES.slice(1).map((s) => (
            <Image key={s.src} src={s.src} alt="" width={24} height={16} sizes="1px" />
          ))}
        </div>
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
          {t('Greece', 'Ελλάδα')}
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
            {topCategories.map((c) => {
              const Icon = categoryIcon(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => pickCategory(c.slug)}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm',
                    'transition-colors duration-200 hover:border-white/60 hover:bg-white/20',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {c.name}
                </button>
              );
            })}
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
        >
          <span className="inline-flex items-center gap-2 text-sm text-sky-100/90">
            <BadgeCheck className="h-4 w-4 text-sky-300" aria-hidden />
            <span>
              <strong className="font-semibold text-white">{totalCount}</strong>{' '}
              {t('verified businesses', 'επαληθευμένες επιχειρήσεις')}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-sky-100/90">
            <MapPin className="h-4 w-4 text-sky-300" aria-hidden />
            {t('Hand-picked by locals', 'Επιλεγμένες από ντόπιους')}
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-sky-100/90">
            <MessageCircle className="h-4 w-4 text-sky-300" aria-hidden />
            {t('Free tips from the assistant', 'Δωρεάν προτάσεις από τον βοηθό')}
          </span>
        </motion.div>
      </motion.div>

      {/* Slide indicators */}
      <div
        className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2"
        role="tablist"
        aria-label={t('Hero photos', 'Φωτογραφίες hero')}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            role="tab"
            aria-selected={i === slide}
            aria-label={t(s.en, s.el)}
            onClick={() => setSlide(i)}
            className={cn(
              'h-1.5 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
              i === slide ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80',
            )}
          />
        ))}
      </div>

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

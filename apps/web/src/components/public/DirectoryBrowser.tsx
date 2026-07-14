'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DirectoryBusiness, DirectoryCategory } from '@/lib/public-directory';
import { cn } from '@aga/ui';
import { Search, SearchX, X } from 'lucide-react';
import { BusinessCard } from './BusinessCard';
import { ALL_CATEGORIES, useDirectorySearch } from '@/lib/directory-search-store';
import { fadeUp, stagger } from './motion';

interface Props {
  locale: string;
  businesses: DirectoryBusiness[];
  categories: DirectoryCategory[];
}

export function DirectoryBrowser({ locale, businesses, categories }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const { query, category, setQuery, setCategory, reset } = useDirectorySearch();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (category !== ALL_CATEGORIES && b.categorySlug !== category) return false;
      if (!q) return true;
      const haystack = [b.name, b.description ?? '', b.address, b.tags.join(' ')]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [businesses, category, query]);

  const suggestions = categories.slice(0, 2).map((c) => c.name);

  return (
    <section id="directory" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-14">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <motion.div variants={fadeUp} className="mb-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {t('Directory', 'Κατάλογος')}
          </p>
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            {t('Explore every place', 'Εξερευνήστε όλα τα μέρη')}
          </h2>
        </motion.div>

        {/* Search bar */}
        <motion.div variants={fadeUp} className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search by name, tag, area…', 'Αναζήτηση με όνομα, ετικέτα, περιοχή…')}
            aria-label={t('Search businesses', 'Αναζήτηση επιχειρήσεων')}
            className="h-12 w-full rounded-full border border-input bg-background pl-11 pr-24 text-base shadow-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('Clear search', 'Καθαρισμός αναζήτησης')}
              className="absolute right-16 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm tabular-nums text-muted-foreground">
            {filtered.length} {t(filtered.length === 1 ? 'place' : 'places', 'μέρη')}
          </span>
        </motion.div>

        {/* Category chips */}
        <motion.div variants={fadeUp} className="-mx-1 mt-5 flex flex-wrap gap-1.5">
          <CategoryChip
            label={t('All', 'Όλα')}
            count={businesses.length}
            active={category === ALL_CATEGORIES}
            onClick={() => setCategory(ALL_CATEGORIES)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.slug}
              label={c.name}
              count={c.count}
              active={category === c.slug}
              onClick={() => setCategory(c.slug)}
            />
          ))}
        </motion.div>
      </motion.div>

      {filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <SearchX className="h-10 w-10 text-muted-foreground/60" aria-hidden strokeWidth={1.5} />
          <p className="mt-4 text-base font-medium">
            {query.trim()
              ? t(`No results for “${query.trim()}”.`, `Κανένα αποτέλεσμα για «${query.trim()}».`)
              : t('No results.', 'Κανένα αποτέλεσμα.')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {suggestions.length > 0
              ? t(
                  `Try ${suggestions.join(' or ')}, or clear the filters.`,
                  `Δοκιμάστε ${suggestions.join(' ή ')}, ή καθαρίστε τα φίλτρα.`,
                )
              : t('Try a different search.', 'Δοκιμάστε άλλη αναζήτηση.')}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 cursor-pointer rounded-full border border-input px-5 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-accent/40"
          >
            {t('Clear filters', 'Καθαρισμός φίλτρων')}
          </button>
        </div>
      ) : (
        <motion.ul layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((b) => (
              <motion.li
                key={b.id}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <BusinessCard locale={locale} business={b} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </section>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors duration-200',
        active
          ? 'border-primary text-primary-foreground'
          : 'border-input bg-background text-foreground hover:bg-accent/40',
      )}
    >
      {active && (
        <motion.span
          layoutId="active-category-pill"
          className="absolute inset-0 rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10">{label}</span>
      <span
        className={cn(
          'relative z-10 text-xs',
          active ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

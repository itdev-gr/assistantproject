'use client';

import { motion } from 'framer-motion';
import type { DirectoryCategory } from '@/lib/public-directory';
import { scrollToDirectory, useDirectorySearch } from '@/lib/directory-search-store';
import { categoryIcon } from './category-icons';
import { fadeUp, stagger } from './motion';

interface Props {
  locale: string;
  categories: DirectoryCategory[];
}

/** One-click category tiles right under the hero. */
export function CategoryQuickNav({ locale, categories }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const { setCategory } = useDirectorySearch();

  if (categories.length === 0) return null;

  function pick(slug: string) {
    setCategory(slug);
    scrollToDirectory();
  }

  return (
    <section className="bg-background">
      <motion.div
        className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-10 sm:grid-cols-3 lg:grid-cols-6"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        {categories.slice(0, 6).map((c) => {
          const Icon = categoryIcon(c.slug);
          return (
            <motion.button
              key={c.slug}
              type="button"
              variants={fadeUp}
              onClick={() => pick(c.slug)}
              className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg border bg-card px-3 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold">{c.name}</span>
              <span className="text-xs text-muted-foreground">
                {c.count}{' '}
                {c.count === 1 ? t('option', 'επιλογή') : t('options', 'επιλογές')}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { DirectoryBusiness } from '@/lib/public-directory';
import { Badge } from '@aga/ui';
import { CategoryGlyph } from './category-icons';
import { fadeUp, stagger } from './motion';

interface Props {
  locale: string;
  businesses: DirectoryBusiness[];
}

export function FeaturedStrip({ locale, businesses }: Props) {
  if (businesses.length === 0) return null;
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-b bg-gradient-to-b from-sky-50/80 to-background">
      <motion.div
        className="mx-auto max-w-6xl px-4 py-14"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <motion.div variants={fadeUp} className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t('Hand-picked', 'Επιλεγμένα')}
            </p>
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
              {t('Featured this week', 'Προτεινόμενα αυτή την εβδομάδα')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{businesses.length}</p>
        </motion.div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3">
          {businesses.map((b) => (
            <motion.div
              key={b.id}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-[320px] flex-shrink-0 snap-start"
            >
              <Link
                href={`/p/${b.id}`}
                className="group block h-full cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow duration-200 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  {b.images[0] ? (
                    <img
                      src={b.images[0]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <CategoryGlyph slug={b.categorySlug} />
                  )}
                  <Badge variant="promoted" className="absolute left-3 top-3 shadow-sm">
                    {t('Featured', 'Προτεινόμενο')}
                  </Badge>
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {b.categoryName}
                  </p>
                  <p className="mt-1 line-clamp-1 text-base font-semibold">{b.name}</p>
                  {b.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {b.description}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

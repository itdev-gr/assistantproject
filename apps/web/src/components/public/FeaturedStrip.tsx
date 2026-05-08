import { Link } from '@/i18n/routing';
import type { DirectoryBusiness } from '@/lib/public-directory';
import { Badge } from '@aga/ui';

interface Props {
  locale: string;
  businesses: DirectoryBusiness[];
}

const ICONS: Record<string, string> = {
  restaurants: '🍽️',
  'bars-cafes': '🍸',
  activities: '🥾',
  'boat-trips': '⛵',
  taxis: '🚖',
  shops: '🛍️',
  events: '🎉',
};

export function FeaturedStrip({ locale, businesses }: Props) {
  if (businesses.length === 0) return null;
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-b bg-gradient-to-br from-background to-accent/20">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{t('Featured this week', 'Προτεινόμενα αυτή την εβδομάδα')}</h2>
          <p className="text-xs text-muted-foreground">{businesses.length}</p>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/p/${b.id}`}
              className="group relative w-[280px] flex-shrink-0 snap-start overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-accent/40 to-muted">
                {b.images[0] ? (
                  <img
                    src={b.images[0]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl opacity-60">
                    <span aria-hidden>{ICONS[b.categorySlug] ?? '📍'}</span>
                  </div>
                )}
                <Badge variant="promoted" className="absolute left-2 top-2 shadow-sm">
                  {t('Featured', 'Προτεινόμενο')}
                </Badge>
              </div>
              <div className="p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {b.categoryName}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm font-semibold">{b.name}</p>
                {b.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {b.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

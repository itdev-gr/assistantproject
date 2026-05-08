import { Link } from '@/i18n/routing';
import type { DirectoryBusiness } from '@/lib/public-directory';
import { Badge, Card, CardContent, cn } from '@aga/ui';
import { MapPin, Navigation } from 'lucide-react';
import { formatDistanceKm } from '@aga/i18n';

interface Props {
  locale: string;
  business: DirectoryBusiness;
}

export function BusinessCard({ locale, business }: Props) {
  const isFeatured =
    business.hasPartner &&
    (business.topTier === 'featured' || business.topTier === 'exclusive');
  return (
    <Link
      href={`/p/${business.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-accent/40 to-muted">
          {business.images[0] ? (
            <img
              src={business.images[0]}
              alt={business.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <CategoryGlyph slug={business.categorySlug} />
          )}
          {isFeatured && (
            <Badge variant="promoted" className="absolute left-2 top-2 shadow-sm">
              {locale === 'en' ? 'Featured' : 'Προτεινόμενο'}
            </Badge>
          )}
          {business.priceBand != null && (
            <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
              {'€'.repeat(business.priceBand)}
            </span>
          )}
          {business.distanceKm != null && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
              <Navigation className="h-3 w-3" aria-hidden />
              {formatDistanceKm(business.distanceKm, locale === 'en' ? 'en' : 'el')}
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {business.categoryName}
          </p>
          <h3 className="mt-0.5 line-clamp-1 text-base font-semibold">{business.name}</h3>
          {business.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {business.description}
            </p>
          )}
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden />
            <span className="line-clamp-1">{business.address}</span>
          </p>
          {business.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1">
              {business.tags.slice(0, 3).map((t) => (
                <li
                  key={t}
                  className={cn(
                    'rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
                  )}
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Link>
  );
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

function CategoryGlyph({ slug }: { slug: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-5xl opacity-60">
      <span aria-hidden>{ICONS[slug] ?? '📍'}</span>
    </div>
  );
}

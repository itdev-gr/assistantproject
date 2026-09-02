import { Link } from '@/i18n/routing';
import type { DirectoryBusiness } from '@/lib/public-directory';
import { BusinessCard } from '@/components/public/BusinessCard';

interface Props {
  locale: string;
  title: string;
  subtitle: string;
  emptyMessage: string;
  businesses: DirectoryBusiness[];
}

/** Shared list layout for the favourites / visited / recent pages. */
export function LibraryGrid({ locale, title, subtitle, emptyMessage, businesses }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {businesses.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {emptyMessage}{' '}
          <Link href="/" className="text-primary hover:underline">
            {locale === 'en' ? 'Browse the guide' : 'Περιηγηθείτε στον οδηγό'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessCard key={b.id} locale={locale} business={b} />
          ))}
        </div>
      )}
    </div>
  );
}

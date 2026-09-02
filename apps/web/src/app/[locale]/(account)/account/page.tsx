import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { requireUser } from '@/lib/auth-context';
import { homeForRole } from '@/lib/roles';
import { getServerClient } from '@/lib/supabase-server';
import { LIBRARY_BUSINESS_SELECT, pluckBusinesses, toLocale, type LibraryBusinessRow } from '@/lib/user-library';
import { BusinessCard } from '@/components/public/BusinessCard';
import { StatCard } from '@/components/dashboard/StatCard';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AccountOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireUser();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const supabase = await getServerClient();

  const [profile, favCount, visitCount, recentCount, latestFavs] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', ctx.userId).maybeSingle(),
    supabase.from('user_favorites').select('business_id', { count: 'exact', head: true }).eq('user_id', ctx.userId),
    supabase.from('user_visits').select('business_id', { count: 'exact', head: true }).eq('user_id', ctx.userId),
    supabase.from('user_recent_views').select('business_id', { count: 'exact', head: true }).eq('user_id', ctx.userId),
    supabase
      .from('user_favorites')
      .select(`created_at, business:businesses ( ${LIBRARY_BUSINESS_SELECT} )`)
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const name = profile.data?.display_name || ctx.email;
  const favourites = pluckBusinesses(
    latestFavs.data as unknown as { business: LibraryBusinessRow | null }[] | null,
    toLocale(locale),
  );
  const dashboard = ctx.role === 'user' ? null : homeForRole(ctx.role);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{t('Hello', 'Γεια σας')}, {name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Your saved places, all in one spot.', 'Τα αποθηκευμένα σας μέρη, όλα σε ένα σημείο.')}
          </p>
        </div>
        {dashboard && (
          <Button asChild variant="outline" size="sm">
            <Link href={dashboard}>
              {ctx.role === 'partner'
                ? t('Partner dashboard', 'Πίνακας συνεργάτη')
                : ctx.role === 'super_admin'
                  ? t('Admin', 'Διαχείριση')
                  : t('Hotel dashboard', 'Πίνακας ξενοδοχείου')}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('Favourites', 'Αγαπημένα')} value={favCount.count ?? 0} href="/account/favorites" />
        <StatCard label={t("Where I've been", 'Πού έχω πάει')} value={visitCount.count ?? 0} href="/account/visited" />
        <StatCard label={t('Recently viewed', 'Πρόσφατα')} value={recentCount.count ?? 0} href="/account/recent" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('Latest favourites', 'Τελευταία αγαπημένα')}</h2>
          {favourites.length > 0 && (
            <Link href="/account/favorites" className="text-sm text-primary hover:underline">
              {t('See all', 'Όλα')}
            </Link>
          )}
        </div>
        {favourites.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            {t('Tap the heart on any place to save it here.', 'Πατήστε την καρδιά σε οποιοδήποτε μέρος για να το αποθηκεύσετε εδώ.')}{' '}
            <Link href="/" className="text-primary hover:underline">
              {t('Browse the guide', 'Περιηγηθείτε στον οδηγό')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favourites.map((b) => (
              <BusinessCard key={b.id} locale={locale} business={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { setRequestLocale } from 'next-intl/server';
import { requireUser } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { LIBRARY_BUSINESS_SELECT, pluckBusinesses, toLocale, type LibraryBusinessRow } from '@/lib/user-library';
import { LibraryGrid } from '@/components/account/LibraryGrid';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RecentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireUser('/account/recent');
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const supabase = await getServerClient();
  const { data } = await supabase
    .from('user_recent_views')
    .select(`viewed_at, business:businesses ( ${LIBRARY_BUSINESS_SELECT} )`)
    .eq('user_id', ctx.userId)
    .order('viewed_at', { ascending: false })
    .limit(200);
  const businesses = pluckBusinesses(
    data as unknown as { business: LibraryBusinessRow | null }[] | null,
    toLocale(locale),
  );
  return (
    <LibraryGrid
      locale={locale}
      title={t("Recently viewed", 'Πρόσφατα είδα')}
      subtitle={t("The last 50 places you opened.", 'Τα τελευταία 50 μέρη που ανοίξατε.')}
      emptyMessage={t("You have not opened any place yet.", 'Δεν έχετε ανοίξει κάποιο μέρος ακόμη.')}
      businesses={businesses}
    />
  );
}

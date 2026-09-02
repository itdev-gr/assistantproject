import { setRequestLocale } from 'next-intl/server';
import { requireUser } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { LIBRARY_BUSINESS_SELECT, pluckBusinesses, toLocale, type LibraryBusinessRow } from '@/lib/user-library';
import { LibraryGrid } from '@/components/account/LibraryGrid';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function VisitedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireUser('/account/visited');
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const supabase = await getServerClient();
  const { data } = await supabase
    .from('user_visits')
    .select(`visited_at, business:businesses ( ${LIBRARY_BUSINESS_SELECT} )`)
    .eq('user_id', ctx.userId)
    .order('visited_at', { ascending: false })
    .limit(200);
  const businesses = pluckBusinesses(
    data as unknown as { business: LibraryBusinessRow | null }[] | null,
    toLocale(locale),
  );
  return (
    <LibraryGrid
      locale={locale}
      title={t("Where I've been", 'Πού έχω πάει')}
      subtitle={t("Places you marked as visited, plus partner links you opened from the assistant.", 'Μέρη που σημειώσατε ως επίσκεψη, και σύνδεσμοι συνεργατών που ανοίξατε από τον βοηθό.')}
      emptyMessage={t("Nothing here yet.", 'Τίποτα εδώ ακόμη.')}
      businesses={businesses}
    />
  );
}

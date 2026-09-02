import { setRequestLocale } from 'next-intl/server';
import { requireUser } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { LIBRARY_BUSINESS_SELECT, pluckBusinesses, toLocale, type LibraryBusinessRow } from '@/lib/user-library';
import { LibraryGrid } from '@/components/account/LibraryGrid';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireUser('/account/favorites');
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const supabase = await getServerClient();
  const { data } = await supabase
    .from('user_favorites')
    .select(`created_at, business:businesses ( ${LIBRARY_BUSINESS_SELECT} )`)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(200);
  const businesses = pluckBusinesses(
    data as unknown as { business: LibraryBusinessRow | null }[] | null,
    toLocale(locale),
  );
  return (
    <LibraryGrid
      locale={locale}
      title={t("Favourites", 'Αγαπημένα')}
      subtitle={t("Places you saved with the heart.", 'Μέρη που αποθηκεύσατε με την καρδιά.')}
      emptyMessage={t("No favourites yet.", 'Δεν έχετε αγαπημένα ακόμη.')}
      businesses={businesses}
    />
  );
}

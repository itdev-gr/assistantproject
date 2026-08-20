import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Button } from '@aga/ui';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Props {
  params: Promise<{ locale: string }>;
}

const GRID = 'grid grid-cols-[1fr_4rem_8rem_7rem] items-center gap-3';

export default async function BusinessesListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const { data: businesses } = await supabase
    .from('businesses')
    .select(
      'id, name, lat, lng, price_band, verified, active, category:business_categories(slug, name_i18n)',
    )
    .order('name');

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div>
      <PageHeader
        title={t('Businesses', 'Επιχειρήσεις')}
        subtitle={t(
          'The local businesses shown in the public directory.',
          'Οι τοπικές επιχειρήσεις που εμφανίζονται στον δημόσιο κατάλογο.',
        )}
        actions={
          <Button asChild>
            <Link href="/admin/businesses/new">{t('New business', 'Νέα επιχείρηση')}</Link>
          </Button>
        }
      />
      <TableFrame minWidth="min-w-[640px]">
        <div className={`${GRID} ${tableHead}`}>
          <span>{t('Business', 'Επιχείρηση')}</span>
          <span>{t('Price', 'Τιμή')}</span>
          <span>{t('Verification', 'Έγκριση')}</span>
          <span>{t('Status', 'Κατάσταση')}</span>
        </div>
        {businesses && businesses.length > 0 ? (
          businesses.map((b) => {
            const cat = b.category as { slug: string; name_i18n: Record<string, string> } | null;
            return (
              <Link
                key={b.id}
                href={`/admin/businesses/${b.id}`}
                className={`${GRID} px-4 py-3 ${tableRow}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{b.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {cat?.name_i18n[locale] ?? cat?.slug}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {b.price_band ? '€'.repeat(b.price_band) : '—'}
                </span>
                <Pill tone={b.verified ? 'ok' : 'warn'}>
                  {b.verified ? t('verified', 'εγκεκριμένη') : t('pending', 'εκκρεμεί')}
                </Pill>
                <Pill tone={b.active ? 'info' : 'muted'}>
                  {b.active ? t('active', 'ενεργή') : t('inactive', 'ανενεργή')}
                </Pill>
              </Link>
            );
          })
        ) : (
          <EmptyState message={t('No businesses yet.', 'Καμία εγγραφή ακόμη.')} />
        )}
      </TableFrame>
    </div>
  );
}

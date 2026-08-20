import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Button } from '@aga/ui';
import { ReindexKnowledgeButton } from '@/components/admin/ReindexKnowledgeButton';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Props {
  params: Promise<{ locale: string }>;
}

const GRID = 'grid grid-cols-[1fr_8rem_7rem] items-center gap-3';

export default async function TenantsListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, slug, name, subscription_tier, active, default_locale, created_at')
    .order('created_at', { ascending: false });

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div>
      <PageHeader
        title={t('Hotels', 'Καταλύματα')}
        subtitle={t('All tenant hotels on the platform.', 'Όλα τα καταλύματα της πλατφόρμας.')}
        actions={
          <>
            <ReindexKnowledgeButton locale={locale} />
            <Button asChild>
              <Link href="/admin/new-tenant">{t('New tenant', 'Νέο κατάλυμα')}</Link>
            </Button>
          </>
        }
      />
      <TableFrame minWidth="min-w-[560px]">
        <div className={`${GRID} ${tableHead}`}>
          <span>{t('Hotel', 'Κατάλυμα')}</span>
          <span>{t('Tier', 'Πακέτο')}</span>
          <span>{t('Status', 'Κατάσταση')}</span>
        </div>
        {hotels && hotels.length > 0 ? (
          hotels.map((h) => (
            <Link
              key={h.id}
              href={`/admin/tenants/${h.id}`}
              className={`${GRID} px-4 py-3 ${tableRow}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium">{h.name}</span>
                <span className="block truncate text-xs text-muted-foreground">/h/{h.slug}</span>
              </span>
              <Pill tone="info">{h.subscription_tier}</Pill>
              <Pill tone={h.active ? 'ok' : 'muted'}>
                {h.active ? t('active', 'ενεργό') : t('inactive', 'ανενεργό')}
              </Pill>
            </Link>
          ))
        ) : (
          <EmptyState message={t('No hotels yet.', 'Καμία εγγραφή ακόμη.')} />
        )}
      </TableFrame>
    </div>
  );
}

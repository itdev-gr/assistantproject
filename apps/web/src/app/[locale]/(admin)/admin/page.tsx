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
import { hotelPlanFor } from '@/lib/hotel-plans';

interface Props {
  params: Promise<{ locale: string }>;
}

const GRID = 'grid grid-cols-[1fr_11rem_7rem_7rem] items-center gap-3';

export default async function TenantsListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const { data: hotels } = await supabase
    .from('hotels')
    .select(
      'id, slug, name, plan, billing_status, launch_offer_rank, active, default_locale, created_at',
    )
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
          <span>{t('Package', 'Πακέτο')}</span>
          <span>{t('Billing', 'Χρέωση')}</span>
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
                <span className="text-muted-foreground block truncate text-xs">/h/{h.slug}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1">
                <Pill tone="info">
                  {(() => {
                    const d = hotelPlanFor(h.plan);
                    return d ? (locale === 'en' ? d.name.en : d.name.el) : h.plan;
                  })()}
                </Pill>
                {h.launch_offer_rank && <Pill tone="warn">#{h.launch_offer_rank}</Pill>}
              </span>
              <Pill
                tone={
                  h.billing_status === 'active'
                    ? 'ok'
                    : h.billing_status === 'past_due'
                      ? 'warn'
                      : 'muted'
                }
              >
                {h.billing_status.replace('_', ' ')}
              </Pill>
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

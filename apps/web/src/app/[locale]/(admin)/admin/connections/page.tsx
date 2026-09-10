import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { formatCommission } from '@/lib/connections';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { RequestRow, type RequestRowData } from '@/components/connections/RequestRow';
import { CancelRequestButton, DecideRequestActions } from '@/components/connections/ConnectionRequestActions';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

type Filter = 'pending' | 'unclaimed' | 'accepted' | 'declined' | 'cancelled';
const FILTERS: Filter[] = ['pending', 'unclaimed', 'accepted', 'declined', 'cancelled'];

type Named = { name: string } | null;

export default async function AdminConnectionsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const filter: Filter = FILTERS.includes(sp.status as Filter) ? (sp.status as Filter) : 'pending';
  const supabase = await getServerClient();

  const status = filter === 'unclaimed' ? 'pending' : filter;
  const [{ data: rows }, { data: owners }, ...counts] = await Promise.all([
    supabase
      .from('partnership_requests')
      .select(
        'id, hotel_id, business_id, status, initiated_by, message, proposed_commission_pct, guest_offer, decline_reason, created_at, decided_at, hotel:hotels(name), business:businesses(name)',
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('business_owners').select('business_id'),
    ...(['pending', 'accepted', 'declined', 'cancelled'] as const).map((s) =>
      supabase.from('partnership_requests').select('id', { count: 'exact', head: true }).eq('status', s),
    ),
  ]);
  const owned = new Set((owners ?? []).map((o) => o.business_id));
  const all = (rows ?? []).map((r) => ({
    ...r,
    hotel: r.hotel as unknown as Named,
    business: r.business as unknown as Named,
    unclaimed: !owned.has(r.business_id),
  }));
  const list = filter === 'unclaimed' ? all.filter((r) => r.unclaimed) : all;

  const countFor = (f: Filter) => {
    if (f === 'unclaimed') return filter === 'pending' || filter === 'unclaimed' ? all.filter((r) => r.unclaimed).length : undefined;
    const i = ['pending', 'accepted', 'declined', 'cancelled'].indexOf(f);
    return counts[i]?.count ?? 0;
  };
  const labels: Record<Filter, string> = {
    pending: t('Pending', 'Εκκρεμή'),
    unclaimed: t('Unclaimed business', 'Χωρίς λογαριασμό'),
    accepted: t('Accepted', 'Αποδεκτά'),
    declined: t('Declined', 'Απορριφθέντα'),
    cancelled: t('Cancelled', 'Ακυρωμένα'),
  };
  const acceptLabel = (pct: number | null) => {
    const c = formatCommission(pct, locale);
    return c ? t(`Accept at ${c}`, `Αποδοχή με ${c}`) : t('Accept', 'Αποδοχή');
  };

  return (
    <div>
      <PageHeader
        title={t('Connection requests', 'Αιτήματα συνεργασίας')}
        subtitle={t(
          'Every hotel ⇄ business request on the platform. Answer on behalf of businesses that have no partner account yet; tiers and billing live under Partnerships.',
          'Όλα τα αιτήματα ξενοδοχείου ⇄ επιχείρησης. Απαντήστε για λογαριασμό επιχειρήσεων χωρίς λογαριασμό συνεργάτη· tiers και χρέωση βρίσκονται στις Συνεργασίες.',
        )}
        actions={
          <Link href="/admin/partnerships" className="text-[14px] text-primary hover:underline">
            {t('Partnerships →', 'Συνεργασίες →')}
          </Link>
        }
      />
      <FilterChips
        className="mb-4"
        chips={FILTERS.map((f) => ({
          href: `/admin/connections?status=${f}`,
          label: labels[f],
          count: countFor(f),
          active: f === filter,
        }))}
      />
      <TableFrame minWidth="min-w-0">
        {list.length === 0 ? (
          <EmptyState message={t('No requests in this state.', 'Κανένα αίτημα σε αυτή την κατάσταση.')} />
        ) : (
          list.map((r) => {
            const hotel = r.hotel?.name ?? t('Hotel', 'Ξενοδοχείο');
            const business = r.business?.name ?? t('Business', 'Επιχείρηση');
            const title = r.initiated_by === 'hotel' ? `${hotel} → ${business}` : `${business} → ${hotel}`;
            return (
              <RequestRow
                key={r.id}
                locale={locale}
                request={r as RequestRowData}
                title={title}
                subtitle={
                  r.initiated_by === 'hotel'
                    ? t('Hotel asks the business', 'Το ξενοδοχείο ζητά από την επιχείρηση')
                    : t('Business asks the hotel', 'Η επιχείρηση ζητά από το ξενοδοχείο')
                }
                tags={
                  r.unclaimed ? (
                    <Pill tone="warn">{t('Business has no account', 'Επιχείρηση χωρίς λογαριασμό')}</Pill>
                  ) : null
                }
                actions={
                  r.status === 'pending' ? (
                    <div className="flex flex-wrap items-start gap-4">
                      <DecideRequestActions
                        locale={locale}
                        requestId={r.id}
                        acceptLabel={acceptLabel(r.proposed_commission_pct)}
                      />
                      <CancelRequestButton locale={locale} requestId={r.id} />
                    </div>
                  ) : undefined
                }
              />
            );
          })
        )}
      </TableFrame>
    </div>
  );
}

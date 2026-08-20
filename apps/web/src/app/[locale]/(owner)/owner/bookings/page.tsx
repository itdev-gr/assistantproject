import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Pill, type PillTone } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Props {
  params: Promise<{ locale: string }>;
}

const STATUS_TONE: Record<string, PillTone> = {
  confirmed: 'ok',
  pending: 'muted',
  cancelled: 'danger',
  no_show: 'warn',
};

export default async function OwnerBookingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  const { data } = await supabase
    .from('bookings')
    .select(
      `
        id, status, gross_amount, currency, confirmed_at, confirmation_source, created_at,
        referral:referrals!inner (
          id,
          partnership:partnerships!inner ( hotel_id,
            business:businesses ( id, name )
          )
        ),
        commission:commission_events ( commission_amount, state )
      `,
    )
    .eq('referral.partnership.hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
    gross_amount: number | null;
    currency: string;
    confirmed_at: string | null;
    confirmation_source: string | null;
    created_at: string;
    referral: {
      partnership: { business: { name: string } };
    };
    commission: Array<{ commission_amount: number; state: string }>;
  }>;

  const totalGross = rows
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + (r.gross_amount ?? 0), 0);
  const totalCommission = rows
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + (r.commission[0]?.commission_amount ?? 0), 0);
  const confirmedCount = rows.filter((r) => r.status === 'confirmed').length;

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'el-GR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div>
      <PageHeader
        title={t('Bookings', 'Κρατήσεις')}
        subtitle={t(
          'Confirmed guest bookings and the commission they earn you.',
          'Επιβεβαιωμένες κρατήσεις επισκεπτών και η προμήθεια που σας αποφέρουν.',
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('Confirmed', 'Επιβεβαιωμένες')} value={confirmedCount.toLocaleString()} />
        <StatCard label={t('Gross revenue', 'Μικτά έσοδα')} value={fmt(totalGross)} />
        <StatCard
          label={t('Estimated commission', 'Εκτιμώμενη προμήθεια')}
          value={fmt(totalCommission)}
        />
      </div>

      <h2 className="mb-4 mt-10 text-xl font-semibold text-primary">
        {t('All bookings', 'Όλες οι κρατήσεις')}
      </h2>
      <TableFrame minWidth="min-w-[560px]">
        <div className={`grid grid-cols-[1fr_7rem_7rem_8rem] items-center gap-3 ${tableHead}`}>
          <span>{t('Partner', 'Συνεργάτης')}</span>
          <span>{t('Amount', 'Ποσό')}</span>
          <span>{t('Commission', 'Προμήθεια')}</span>
          <span>{t('Status', 'Κατάσταση')}</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            message={t(
              'No bookings yet. Use the Referrals page to mark guest visits as booked.',
              'Καμία κράτηση ακόμη. Χρησιμοποιήστε τη σελίδα Παραπομπών.',
            )}
          />
        ) : (
          rows.map((b) => (
            <div
              key={b.id}
              className={`grid grid-cols-[1fr_7rem_7rem_8rem] items-center gap-3 px-4 py-3 text-[14px] ${tableRow}`}
            >
              <span className="truncate font-medium">{b.referral.partnership.business.name}</span>
              <span className="font-mono text-xs tabular-nums">
                {b.gross_amount != null ? fmt(b.gross_amount) : '—'}
              </span>
              <span className="font-mono text-xs tabular-nums text-olive">
                {b.commission[0]?.commission_amount
                  ? fmt(b.commission[0].commission_amount)
                  : '—'}
              </span>
              <Pill tone={STATUS_TONE[b.status] ?? 'muted'}>{b.status}</Pill>
            </div>
          ))
        )}
      </TableFrame>
    </div>
  );
}

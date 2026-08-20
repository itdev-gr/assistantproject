import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { ConfirmBookingButton } from '@/components/owner/ConfirmBookingButton';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function OwnerReferralsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Pull referrals via the partnerships join scoped to this hotel; RLS already
  // restricts a hotel owner to their own rows.
  const { data: referrals } = await supabase
    .from('referrals')
    .select(
      `
        id, shown_at, clicked_at,
        partnership:partnerships!inner ( hotel_id, commission_pct,
          business:businesses ( id, name )
        ),
        bookings ( id, status )
      `,
    )
    .eq('partnership.hotel_id', ctx.hotelId)
    .gte('shown_at', since90)
    .order('shown_at', { ascending: false })
    .limit(200);

  const rows = (referrals ?? []) as unknown as Array<{
    id: string;
    shown_at: string;
    clicked_at: string | null;
    partnership: {
      hotel_id: string;
      commission_pct: number;
      business: { id: string; name: string };
    };
    bookings: Array<{ id: string; status: string }>;
  }>;

  const total30 = rows.filter((r) => r.shown_at >= since30).length;
  const clicks30 = rows.filter((r) => r.clicked_at && r.clicked_at >= since30).length;
  const ctr30 = total30 === 0 ? 0 : Math.round((clicks30 / total30) * 100);

  const byPartner = new Map<string, { name: string; shown: number; clicked: number }>();
  for (const r of rows) {
    const id = r.partnership.business.id;
    const cur = byPartner.get(id) ?? {
      name: r.partnership.business.name,
      shown: 0,
      clicked: 0,
    };
    cur.shown += 1;
    if (r.clicked_at) cur.clicked += 1;
    byPartner.set(id, cur);
  }
  const topPartners = [...byPartner.values()]
    .sort((a, b) => b.clicked - a.clicked || b.shown - a.shown)
    .slice(0, 5);

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div>
      <PageHeader
        title={t('Referrals', 'Παραπομπές')}
        subtitle={t(
          'How often the assistant recommends your partners — and what guests do next.',
          'Πόσο συχνά ο βοηθός προτείνει τους συνεργάτες σας — και τι κάνουν οι επισκέπτες μετά.',
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('Cards shown (30d)', 'Εμφανίσεις (30 ημ.)')} value={total30.toLocaleString()} />
        <StatCard label={t('Clicks (30d)', 'Κλικ (30 ημ.)')} value={clicks30.toLocaleString()} />
        <StatCard label={t('Click-through rate', 'Ποσοστό κλικ')} value={`${ctr30}%`} />
      </div>

      <h2 className="mb-4 mt-10 text-xl font-semibold text-primary">
        {t('Top partners (90 days)', 'Κορυφαίοι συνεργάτες (90 ημ.)')}
      </h2>
      <TableFrame minWidth="min-w-[420px]">
        {topPartners.length === 0 ? (
          <EmptyState
            message={t('Nothing yet — guests will start clicking soon.', 'Καμία ενέργεια ακόμη.')}
          />
        ) : (
          topPartners.map((p, i) => (
            <div key={p.name + i} className={`flex items-center gap-4 px-4 py-3 text-[14px] ${tableRow}`}>
              <span className="w-6 text-muted-foreground">{i + 1}</span>
              <span className="flex-1 truncate font-medium">{p.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {p.clicked} / {p.shown}
              </span>
            </div>
          ))
        )}
      </TableFrame>

      <h2 className="mb-4 mt-10 text-xl font-semibold text-primary">
        {t('Recent referrals', 'Πρόσφατες παραπομπές')}
      </h2>
      <TableFrame minWidth="min-w-[560px]">
        <div className={`grid grid-cols-[1fr_10rem_7rem_auto] items-center gap-3 ${tableHead}`}>
          <span>{t('Partner', 'Συνεργάτης')}</span>
          <span>{t('Shown', 'Εμφάνιση')}</span>
          <span>{t('Status', 'Κατάσταση')}</span>
          <span />
        </div>
        {rows.length === 0 ? (
          <EmptyState message={t('No referrals yet.', 'Καμία παραπομπή ακόμη.')} />
        ) : (
          rows.slice(0, 50).map((r) => {
            const hasBooking = r.bookings && r.bookings.length > 0;
            return (
              <div
                key={r.id}
                className={`grid grid-cols-[1fr_10rem_7rem_auto] items-center gap-3 px-4 py-3 text-[14px] ${tableRow}`}
              >
                <span className="truncate font-medium">{r.partnership.business.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.shown_at).toLocaleString(locale === 'en' ? 'en-GB' : 'el-GR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {hasBooking ? (
                  <Pill tone="ok">{t('booked', 'κράτηση')}</Pill>
                ) : (
                  <Pill tone={r.clicked_at ? 'info' : 'muted'}>
                    {r.clicked_at ? t('clicked', 'κλικ') : t('shown', 'προβολή')}
                  </Pill>
                )}
                <span className="justify-self-end">
                  {!hasBooking && r.clicked_at && (
                    <ConfirmBookingButton referralId={r.id} locale={locale} />
                  )}
                </span>
              </div>
            );
          })
        )}
      </TableFrame>
    </div>
  );
}

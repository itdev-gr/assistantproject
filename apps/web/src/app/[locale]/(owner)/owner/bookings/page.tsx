import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@aga/ui';

interface Props {
  params: Promise<{ locale: string }>;
}

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('Bookings', 'Κρατήσεις')}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title={t('Confirmed', 'Επιβεβαιωμένες')} value={confirmedCount} />
        <Stat title={t('Gross revenue', 'Μικτά έσοδα')} value={fmt(totalGross)} />
        <Stat
          title={t('Estimated commission', 'Εκτιμώμενη προμήθεια')}
          value={fmt(totalCommission)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('All bookings', 'Όλες οι κρατήσεις')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t(
                'No bookings yet. Use the Referrals page to mark guest visits as booked.',
                'Καμία κράτηση ακόμη. Χρησιμοποιήστε τη σελίδα Παραπομπών.',
              )}
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((b) => (
                <li key={b.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-3 text-sm">
                  <span className="truncate font-medium">{b.referral.partnership.business.name}</span>
                  <span className="font-mono text-xs">
                    {b.gross_amount != null ? fmt(b.gross_amount) : '—'}
                  </span>
                  <span className="text-xs text-emerald-600">
                    {b.commission[0]?.commission_amount
                      ? fmt(b.commission[0].commission_amount)
                      : '—'}
                  </span>
                  <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'}>
                    {b.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </CardContent>
    </Card>
  );
}

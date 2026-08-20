import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function UsagePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: hotels }, { count: msgs30d }, { count: sessions30d }, { count: needsStaff }] =
    await Promise.all([
      supabase.from('hotels').select('id, name').order('name'),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabase
        .from('guest_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', since),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('needs_staff', true),
    ]);

  return (
    <div>
      <PageHeader
        title={locale === 'en' ? 'Usage' : 'Χρήση'}
        subtitle={
          locale === 'en'
            ? 'Platform activity over the last 30 days.'
            : 'Δραστηριότητα της πλατφόρμας τις τελευταίες 30 ημέρες.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={locale === 'en' ? 'Messages (30d)' : 'Μηνύματα (30 ημ.)'}
          value={(msgs30d ?? 0).toLocaleString()}
        />
        <StatCard
          label={locale === 'en' ? 'Sessions (30d)' : 'Σύνοδοι (30 ημ.)'}
          value={(sessions30d ?? 0).toLocaleString()}
        />
        <StatCard
          label={locale === 'en' ? 'Pending staff requests' : 'Αναμένουν προσωπικό'}
          value={(needsStaff ?? 0).toLocaleString()}
        />
      </div>

      <h2 className="mb-4 mt-10 text-xl font-semibold text-primary">
        {locale === 'en' ? 'Per hotel' : 'Ανά κατάλυμα'}
      </h2>
      <TableFrame minWidth="min-w-[480px]">
        <div className={tableHead}>{locale === 'en' ? 'Hotel' : 'Κατάλυμα'}</div>
        {hotels && hotels.length > 0 ? (
          hotels.map((h) => (
            <div key={h.id} className={`flex items-center gap-3 px-4 py-3 text-[14px] ${tableRow}`}>
              <span className="flex-1">{h.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {locale === 'en' ? 'view audit log →' : 'προβολή αρχείου →'}
              </span>
            </div>
          ))
        ) : (
          <EmptyState message={locale === 'en' ? 'No hotels yet.' : 'Δεν υπάρχουν καταλύματα ακόμη.'} />
        )}
      </TableFrame>
    </div>
  );
}

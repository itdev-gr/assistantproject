import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';

export default function OwnerDashboardPage() {
  const t = useTranslations('owner.stats');
  const nav = useTranslations('owner.nav');
  return (
    <div>
      <PageHeader title={nav('dashboard')} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('messagesToday')} value="—" />
        <StatCard label={t('topPartners')} value="—" href="/owner/referrals" />
        <StatCard label={t('estimatedCommission')} value="€—" href="/owner/bookings" />
      </div>
    </div>
  );
}

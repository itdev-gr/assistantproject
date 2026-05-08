import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { useTranslations } from 'next-intl';

export default function OwnerDashboardPage() {
  const t = useTranslations('owner.stats');
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard title={t('messagesToday')} value="—" />
      <StatCard title={t('topPartners')} value="—" />
      <StatCard title={t('estimatedCommission')} value="€—" />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

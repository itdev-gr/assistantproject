import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { createSupabaseServiceClient } from '@aga/db/service';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@aga/ui';
import { BillingActions } from '@/components/owner/BillingActions';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function OwnerBillingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  const admin = createSupabaseServiceClient();
  const { data: hotel } = await admin
    .from('hotels')
    .select('billing_status')
    .eq('id', ctx.hotelId)
    .single();
  const status = hotel?.billing_status ?? 'unbilled';
  const subscribed = status === 'active' || status === 'past_due';

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('Billing', 'Συνδρομή')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('Assistant plan', 'Πλάνο βοηθού')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              'Monthly subscription for the AI guest assistant and the embeddable widget.',
              'Μηνιαία συνδρομή για τον AI βοηθό επισκεπτών και το ενσωματώσιμο widget.',
            )}
          </p>
          <Badge className="capitalize">{status.replace('_', ' ')}</Badge>
          <div>
            <BillingActions locale={locale} subscribed={subscribed} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

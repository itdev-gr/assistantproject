import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { createSupabaseServiceClient } from '@aga/db/service';
import { BillingActions } from '@/components/owner/BillingActions';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill, type PillTone } from '@/components/dashboard/Pill';

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
  const statusTone: PillTone =
    status === 'active' ? 'ok' : status === 'past_due' ? 'warn' : 'muted';

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('Billing', 'Συνδρομή')} />
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold text-primary">{t('Assistant plan', 'Πλάνο βοηθού')}</h2>
        <p className="text-[14px] text-muted-foreground">
          {t(
            'Monthly subscription for the AI guest assistant and the embeddable widget.',
            'Μηνιαία συνδρομή για τον AI βοηθό επισκεπτών και το ενσωματώσιμο widget.',
          )}
        </p>
        <Pill tone={statusTone} className="capitalize">
          {status.replace('_', ' ')}
        </Pill>
        <div>
          <BillingActions locale={locale} subscribed={subscribed} />
        </div>
      </section>
    </div>
  );
}

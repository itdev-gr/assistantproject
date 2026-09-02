import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requirePartner } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Pill } from '@/components/dashboard/Pill';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PartnerOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const businessId = ctx.businessIds[0] ?? null;

  if (!businessId) {
    return (
      <div>
        <PageHeader title={t('Partner dashboard', 'Πίνακας συνεργάτη')} />
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {t(
            'No business is linked to this account yet. Contact us if you think this is a mistake.',
            'Δεν υπάρχει ακόμη συνδεδεμένη επιχείρηση σε αυτόν τον λογαριασμό. Επικοινωνήστε μαζί μας αν πιστεύετε ότι είναι λάθος.',
          )}
        </div>
      </div>
    );
  }

  const supabase = await getServerClient();
  const admin = createSupabaseServiceClient();
  const [{ data: business }, favourites, visits, clicks] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, verified, active, images, address')
      .eq('id', businessId)
      .maybeSingle(),
    admin.from('user_favorites').select('user_id', { count: 'exact', head: true }).eq('business_id', businessId),
    admin.from('user_visits').select('user_id', { count: 'exact', head: true }).eq('business_id', businessId),
    admin
      .from('referrals')
      .select('id, partnership:partnerships!inner(business_id)', { count: 'exact', head: true })
      .eq('partnership.business_id', businessId)
      .not('clicked_at', 'is', null),
  ]);

  return (
    <div>
      <PageHeader
        title={business?.name ?? t('Partner dashboard', 'Πίνακας συνεργάτη')}
        subtitle={business?.address ?? undefined}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/p/${businessId}`}>{t('View public page', 'Δημόσια σελίδα')}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/partner/business">{t('Edit listing', 'Επεξεργασία')}</Link>
            </Button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone={business?.verified ? 'ok' : 'warn'}>
          {business?.verified ? t('Verified', 'Εγκεκριμένη') : t('Awaiting verification', 'Αναμονή έγκρισης')}
        </Pill>
        <Pill tone={business?.active ? 'ok' : 'danger'}>
          {business?.active ? t('Active', 'Ενεργή') : t('Inactive', 'Ανενεργή')}
        </Pill>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('Favourited by', 'Στα αγαπημένα')} value={favourites.count ?? 0} />
        <StatCard label={t('Marked as visited', 'Σημειωμένες επισκέψεις')} value={visits.count ?? 0} />
        <StatCard label={t('Assistant click-throughs', 'Clicks από τον βοηθό')} value={clicks.count ?? 0} />
      </div>
    </div>
  );
}

import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Card, CardContent } from '@aga/ui';
import { PartnershipsEditor } from '@/components/admin/PartnershipsEditor';
import { InvoiceCommissionsButton } from '@/components/admin/InvoiceCommissionsButton';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PartnershipsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const [{ data: hotels }, { data: businesses }, { data: rows }] = await Promise.all([
    supabase.from('hotels').select('id, name, slug').order('name'),
    supabase.from('businesses').select('id, name').order('name'),
    supabase
      .from('partnerships')
      .select(
        'id, hotel_id, business_id, commission_pct, paid_priority_score, subscription_tier, active, contract_starts, contract_ends, billing_status, stripe_subscription_id, hotel:hotels(name), business:businesses(name, billing_email)',
      )
      .order('updated_at', { ascending: false }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          {locale === 'en' ? 'Partnerships' : 'Συνεργασίες'}
        </h1>
        <InvoiceCommissionsButton locale={locale} />
      </div>
      <Card>
        <CardContent className="p-6">
          <PartnershipsEditor
            locale={locale}
            hotels={hotels ?? []}
            businesses={businesses ?? []}
            rows={(rows ?? []).map((r) => ({
              id: r.id,
              hotelId: r.hotel_id,
              hotelName:
                (r.hotel as unknown as { name?: string } | null)?.name ?? r.hotel_id,
              businessId: r.business_id,
              businessName:
                (r.business as unknown as { name?: string } | null)?.name ?? r.business_id,
              billingEmail:
                (r.business as unknown as { billing_email?: string | null } | null)
                  ?.billing_email ?? null,
              commissionPct: Number(r.commission_pct),
              paidPriorityScore: r.paid_priority_score,
              subscriptionTier: r.subscription_tier,
              billingStatus: r.billing_status,
              active: r.active,
              contractStarts: r.contract_starts,
              contractEnds: r.contract_ends,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

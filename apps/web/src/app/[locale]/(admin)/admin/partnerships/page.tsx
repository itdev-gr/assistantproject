import { setRequestLocale } from 'next-intl/server';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { PartnershipsEditor } from '@/components/admin/PartnershipsEditor';
import { InvoiceCommissionsButton } from '@/components/admin/InvoiceCommissionsButton';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PartnershipsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  // Behind requireSuperAdmin(): the service role sees billing/secret columns
  // that client roles are no longer granted (migration 0017).
  const supabase = createSupabaseServiceClient();

  const [{ data: hotels }, { data: businesses }, { data: rows }] = await Promise.all([
    supabase.from('hotels').select('id, name, slug').order('name'),
    supabase.from('businesses').select('id, name').order('name'),
    supabase
      .from('partnerships')
      .select(
        'id, hotel_id, business_id, commission_pct, paid_priority_score, subscription_tier, active, contract_starts, contract_ends, billing_status, stripe_subscription_id, hotel:hotels(name), business:businesses(name, billing_email, billing_status, subscription_tier, billing_exempt)',
      )
      .order('updated_at', { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title={locale === 'en' ? 'Partnerships' : 'Συνεργασίες'}
        subtitle={
          locale === 'en'
            ? 'Hotel ↔ business agreements, commissions and billing.'
            : 'Συμφωνίες καταλυμάτων ↔ επιχειρήσεων, προμήθειες και χρεώσεις.'
        }
        actions={<InvoiceCommissionsButton locale={locale} />}
      />
      <div className="rounded-lg border bg-card p-6">
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
              businessBillingStatus:
                (r.business as unknown as { billing_status?: string } | null)?.billing_status ?? 'unbilled',
              businessTier:
                (r.business as unknown as { subscription_tier?: string } | null)?.subscription_tier ?? 'free',
              businessExempt:
                (r.business as unknown as { billing_exempt?: boolean } | null)?.billing_exempt ?? false,
              active: r.active,
              contractStarts: r.contract_starts,
              contractEnds: r.contract_ends,
            }))}
          />
      </div>
    </div>
  );
}

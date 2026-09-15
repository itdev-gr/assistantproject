import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { BusinessUpsert } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { BusinessForm } from '@/components/admin/BusinessForm';
import { WebhookSecretCard } from '@/components/admin/WebhookSecretCard';
import { BusinessBillingPanel } from '@/components/admin/BusinessBillingPanel';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditBusinessPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  // Behind requireSuperAdmin(): the service role sees billing/secret columns
  // that client roles are no longer granted (migration 0017).
  const supabase = createSupabaseServiceClient();

  const [{ data }, { data: cats }] = await Promise.all([
    supabase
      .from('businesses')
      .select(
        'id, name, category_id, description_i18n, lat, lng, address, phone, whatsapp, website, billing_email, price_band, tags, opening_hours_json, images, verified, active, webhook_secret, billing_status, subscription_tier, billing_exempt, stripe_subscription_id, current_period_end, listed',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('business_categories').select('id, slug, name_i18n').order('slug'),
  ]);
  if (!data) notFound();

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={data.name}
        backHref="/admin/businesses"
        backLabel={locale === 'en' ? 'Businesses' : 'Επιχειρήσεις'}
      />
      <div className="mb-6 rounded-lg border bg-card p-6">
        <BusinessForm
        locale={locale}
        categories={(cats ?? []).map((c) => ({
          id: c.id,
          slug: c.slug,
          label: (c.name_i18n as Record<string, string>)[locale] ?? c.slug,
        }))}
        initial={{
          id: data.id,
          name: data.name,
          categoryId: data.category_id,
          description: (data.description_i18n as Record<string, string>) ?? null,
          lat: data.lat,
          lng: data.lng,
          address: data.address,
          phone: data.phone,
          whatsapp: data.whatsapp,
          website: data.website,
          billingEmail: data.billing_email,
          priceBand: data.price_band ?? 2,
          tags: data.tags ?? [],
          openingHours: (data.opening_hours_json as BusinessUpsert['openingHours']) ?? {},
          images: ((data.images as string[]) ?? []) as string[],
          verified: data.verified,
          active: data.active,
        }}
        />
      </div>
      <div className="mb-6">
        <BusinessBillingPanel
          locale={locale}
          businessId={data.id}
          billingStatus={data.billing_status}
          subscriptionTier={data.subscription_tier}
          billingExempt={data.billing_exempt}
          billingEmail={data.billing_email}
          hasSubscription={!!data.stripe_subscription_id}
          currentPeriodEnd={data.current_period_end}
          listed={data.listed ?? false}
        />
      </div>
      <WebhookSecretCard
        businessId={data.id}
        webhookConfigured={!!data.webhook_secret}
        appOrigin={appOrigin}
        locale={locale}
      />
    </div>
  );
}

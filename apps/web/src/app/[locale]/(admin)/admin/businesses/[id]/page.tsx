import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { BusinessUpsert } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { BusinessForm } from '@/components/admin/BusinessForm';
import { WebhookSecretCard } from '@/components/admin/WebhookSecretCard';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditBusinessPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const [{ data }, { data: cats }] = await Promise.all([
    supabase
      .from('businesses')
      .select(
        'id, name, category_id, description_i18n, lat, lng, address, phone, whatsapp, website, billing_email, price_band, tags, opening_hours_json, images, verified, active, webhook_secret',
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
      <WebhookSecretCard
        businessId={data.id}
        webhookConfigured={!!data.webhook_secret}
        appOrigin={appOrigin}
        locale={locale}
      />
    </div>
  );
}

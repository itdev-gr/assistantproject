import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { BusinessForm } from '@/components/admin/BusinessForm';
import { WebhookSecretCard } from '@/components/admin/WebhookSecretCard';

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
        'id, name, category_id, description_i18n, lat, lng, address, phone, whatsapp, website, price_band, tags, opening_hours_json, images, verified, active, webhook_secret',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('business_categories').select('id, slug, name_i18n').order('slug'),
  ]);
  if (!data) notFound();

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{data.name}</h1>
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
          priceBand: data.price_band ?? 2,
          tags: data.tags ?? [],
          openingHours: (data.opening_hours_json as Record<string, unknown>) ?? null,
          images: ((data.images as string[]) ?? []) as string[],
          verified: data.verified,
          active: data.active,
        }}
      />
      <WebhookSecretCard
        businessId={data.id}
        webhookConfigured={!!data.webhook_secret}
        appOrigin={appOrigin}
        locale={locale}
      />
    </div>
  );
}

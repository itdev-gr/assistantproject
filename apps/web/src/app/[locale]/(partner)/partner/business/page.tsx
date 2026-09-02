import { setRequestLocale } from 'next-intl/server';
import type { BusinessUpsert } from '@aga/api-contracts';
import { requirePartner } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { PartnerBusinessForm } from '@/components/partner/PartnerBusinessForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PartnerBusinessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const businessId = ctx.businessIds[0] ?? null;
  const supabase = await getServerClient();
  const { data } = businessId
    ? await supabase
        .from('businesses')
        .select('id, name, description_i18n, phone, whatsapp, website, price_band, tags, opening_hours_json, images')
        .eq('id', businessId)
        .maybeSingle()
    : { data: null };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={t('My business', 'Η επιχείρησή μου')}
        subtitle={t(
          'Changes appear on the public guide within a few minutes.',
          'Οι αλλαγές εμφανίζονται στον δημόσιο οδηγό μέσα σε λίγα λεπτά.',
        )}
        backHref="/partner"
        backLabel={t('Dashboard', 'Πίνακας')}
      />
      {!data ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {t('No business is linked to this account yet.', 'Δεν υπάρχει ακόμη συνδεδεμένη επιχείρηση.')}
        </div>
      ) : (
        <PartnerBusinessForm
          locale={locale}
          initial={{
            id: data.id,
            name: data.name,
            description: (data.description_i18n as Record<string, string>) ?? null,
            phone: data.phone,
            whatsapp: data.whatsapp,
            website: data.website,
            priceBand: data.price_band ?? 2,
            tags: data.tags ?? [],
            openingHours: (data.opening_hours_json as BusinessUpsert['openingHours']) ?? {},
            images: ((data.images as string[]) ?? []) as string[],
          }}
        />
      )}
    </div>
  );
}

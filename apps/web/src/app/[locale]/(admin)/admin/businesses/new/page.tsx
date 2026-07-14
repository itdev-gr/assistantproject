import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { BusinessForm } from '@/components/admin/BusinessForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function NewBusinessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();
  const { data: cats } = await supabase
    .from('business_categories')
    .select('id, slug, name_i18n')
    .order('slug');

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'New business' : 'Νέα επιχείρηση'}
      </h1>
      <BusinessForm
        locale={locale}
        categories={(cats ?? []).map((c) => ({
          id: c.id,
          slug: c.slug,
          label: (c.name_i18n as Record<string, string>)[locale] ?? c.slug,
        }))}
        initial={{
          name: '',
          categoryId: cats?.[0]?.id ?? '',
          description: null,
          lat: 0,
          lng: 0,
          address: '',
          phone: null,
          whatsapp: null,
          website: null,
          billingEmail: null,
          priceBand: 2,
          tags: [],
          openingHours: null,
          images: [],
          verified: false,
          active: true,
        }}
      />
    </div>
  );
}

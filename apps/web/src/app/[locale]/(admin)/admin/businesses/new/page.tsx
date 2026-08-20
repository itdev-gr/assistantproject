import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { BusinessForm } from '@/components/admin/BusinessForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

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
      <PageHeader
        title={locale === 'en' ? 'New business' : 'Νέα επιχείρηση'}
        backHref="/admin/businesses"
        backLabel={locale === 'en' ? 'Businesses' : 'Επιχειρήσεις'}
      />
      <div className="rounded-lg border bg-card p-6">
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
          openingHours: {},
          images: [],
          verified: false,
          active: true,
        }}
        />
      </div>
    </div>
  );
}

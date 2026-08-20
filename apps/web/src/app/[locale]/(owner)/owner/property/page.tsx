import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { PropertyForm } from '@/components/owner/PropertyForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PropertyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const { data: hotel } = await supabase
    .from('hotels')
    .select('id, name, slug, timezone, default_locale, lat, lng, brand_json')
    .eq('id', ctx.hotelId)
    .maybeSingle();

  if (!hotel) notFound();

  const brand = (hotel.brand_json ?? {}) as { logoUrl?: string | null; primaryColor?: string | null };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={locale === 'en' ? 'Property profile' : 'Στοιχεία καταλύματος'}
      />
      <div className="rounded-lg border bg-card p-6">
        <PropertyForm
        locale={locale}
        initial={{
          name: hotel.name,
          slug: hotel.slug,
          timezone: hotel.timezone,
          defaultLocale: hotel.default_locale as 'el' | 'en',
          lat: hotel.lat,
          lng: hotel.lng,
          brand: {
            logoUrl: brand.logoUrl ?? null,
            primaryColor: brand.primaryColor ?? null,
          },
        }}
        />
      </div>
    </div>
  );
}

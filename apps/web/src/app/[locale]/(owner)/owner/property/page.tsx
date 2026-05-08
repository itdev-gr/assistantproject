import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { PropertyForm } from '@/components/owner/PropertyForm';

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
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'Property profile' : 'Στοιχεία καταλύματος'}
      </h1>
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
  );
}

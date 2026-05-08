import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { AmenityForm } from '@/components/owner/AmenityForm';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditAmenityPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();
  const { data } = await supabase
    .from('amenities')
    .select('id, name, description, location_on_property, hours_json, state')
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'Edit amenity' : 'Επεξεργασία παροχής'}
      </h1>
      <AmenityForm
        locale={locale}
        initial={{
          id: data.id,
          name: data.name,
          description: data.description,
          locationOnProperty: data.location_on_property,
          hours: (data.hours_json as Record<string, unknown>) ?? null,
          published: data.state === 'published',
        }}
      />
    </div>
  );
}

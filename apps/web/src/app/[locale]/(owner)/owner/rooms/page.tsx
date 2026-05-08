import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Card, CardContent } from '@aga/ui';
import { RoomsEditor } from '@/components/owner/RoomsEditor';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RoomsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const [{ data: rooms }, { data: hotel }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, code, floor, view, notes')
      .eq('hotel_id', ctx.hotelId)
      .order('code'),
    supabase.from('hotels').select('slug').eq('id', ctx.hotelId).single(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{locale === 'en' ? 'Rooms' : 'Δωμάτια'}</h1>
      <Card>
        <CardContent className="p-6">
          <RoomsEditor
            locale={locale}
            hotelSlug={hotel?.slug ?? ''}
            rows={(rooms ?? []).map((r) => ({
              id: r.id,
              code: r.code,
              floor: r.floor,
              view: r.view,
              notes: r.notes,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

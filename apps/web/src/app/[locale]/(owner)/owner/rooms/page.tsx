import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { RoomsEditor } from '@/components/owner/RoomsEditor';
import { PageHeader } from '@/components/dashboard/PageHeader';

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
      <PageHeader
        title={locale === 'en' ? 'Rooms' : 'Δωμάτια'}
        subtitle={
          locale === 'en'
            ? 'Rooms and their guest chat QR deep-links.'
            : 'Δωμάτια και τα QR deep-links για το chat επισκεπτών.'
        }
      />
      <div className="overflow-x-auto">
        <div className="min-w-[640px] rounded-lg border bg-card p-6">
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
        </div>
      </div>
    </div>
  );
}

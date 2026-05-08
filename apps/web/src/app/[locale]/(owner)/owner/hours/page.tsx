import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Card, CardContent } from '@aga/ui';
import { HoursTable } from '@/components/owner/HoursTable';

interface Props {
  params: Promise<{ locale: string }>;
}

const WEEKDAYS_EL = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function HoursPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const { data } = await supabase
    .from('hours')
    .select('id, entity_type, entity_ref, weekday, opens, closes, seasonal_start, seasonal_end')
    .eq('hotel_id', ctx.hotelId)
    .order('entity_type')
    .order('weekday');

  const weekdays = locale === 'en' ? WEEKDAYS_EN : WEEKDAYS_EL;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'Opening hours' : 'Ώρες λειτουργίας'}
      </h1>
      <Card>
        <CardContent className="p-6">
          <HoursTable
            locale={locale}
            weekdays={weekdays}
            rows={(data ?? []).map((r) => ({
              id: r.id,
              entityType: r.entity_type,
              entityRef: r.entity_ref,
              weekday: r.weekday,
              opens: r.opens,
              closes: r.closes,
              seasonalStart: r.seasonal_start,
              seasonalEnd: r.seasonal_end,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

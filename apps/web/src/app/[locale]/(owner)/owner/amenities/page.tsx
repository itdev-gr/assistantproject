import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Button } from '@aga/ui';
import { AmenityRowActions } from '@/components/owner/AmenityRowActions';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AmenitiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const { data: amenities } = await supabase
    .from('amenities')
    .select('id, name, location_on_property, state, updated_at')
    .eq('hotel_id', ctx.hotelId)
    .order('updated_at', { ascending: false });

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div>
      <PageHeader
        title={t('Amenities', 'Παροχές')}
        subtitle={t(
          'Pools, spas, gyms — everything the assistant can point guests to.',
          'Πισίνες, spa, γυμναστήρια — ό,τι μπορεί να προτείνει ο βοηθός στους επισκέπτες.',
        )}
        actions={
          <Button asChild>
            <Link href="/owner/amenities/new">{t('New amenity', 'Νέα παροχή')}</Link>
          </Button>
        }
      />

      <TableFrame minWidth="min-w-[520px]">
        {!amenities || amenities.length === 0 ? (
          <EmptyState message={t('No amenities yet.', 'Καμία παροχή ακόμη.')} />
        ) : (
          amenities.map((a) => (
            <div key={a.id} className={`flex items-center gap-4 px-4 py-3 ${tableRow}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{a.name}</p>
                {a.location_on_property && (
                  <p className="truncate text-xs text-muted-foreground">
                    {a.location_on_property}
                  </p>
                )}
              </div>
              <Pill tone={a.state === 'published' ? 'ok' : 'warn'}>{a.state}</Pill>
              <AmenityRowActions id={a.id} editHref={`/owner/amenities/${a.id}`} locale={locale} />
            </div>
          ))
        )}
      </TableFrame>
    </div>
  );
}

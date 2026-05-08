import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Button, Card, CardContent, Badge } from '@aga/ui';
import { AmenityRowActions } from '@/components/owner/AmenityRowActions';

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{locale === 'en' ? 'Amenities' : 'Παροχές'}</h1>
        <Button asChild={false}>
          <Link href="/owner/amenities/new">
            {locale === 'en' ? 'New amenity' : 'Νέα παροχή'}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {(!amenities || amenities.length === 0) && (
            <p className="p-6 text-sm text-muted-foreground">
              {locale === 'en' ? 'No amenities yet.' : 'Καμία παροχή ακόμη.'}
            </p>
          )}
          <ul className="divide-y">
            {amenities?.map((a) => (
              <li key={a.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  {a.location_on_property && (
                    <p className="truncate text-xs text-muted-foreground">
                      {a.location_on_property}
                    </p>
                  )}
                </div>
                <Badge variant={a.state === 'published' ? 'default' : 'secondary'}>
                  {a.state}
                </Badge>
                <AmenityRowActions
                  id={a.id}
                  editHref={`/owner/amenities/${a.id}`}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

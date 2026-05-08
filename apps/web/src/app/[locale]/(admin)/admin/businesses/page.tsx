import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Badge, Button, Card, CardContent } from '@aga/ui';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function BusinessesListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const { data: businesses } = await supabase
    .from('businesses')
    .select(
      'id, name, lat, lng, price_band, verified, active, category:business_categories(slug, name_i18n)',
    )
    .order('name');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {locale === 'en' ? 'Businesses' : 'Επιχειρήσεις'}
        </h1>
        <Button asChild={false}>
          <Link href="/admin/businesses/new">
            {locale === 'en' ? 'New business' : 'Νέα επιχείρηση'}
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {businesses?.map((b) => {
              const cat = b.category as { slug: string; name_i18n: Record<string, string> } | null;
              return (
                <li key={b.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {cat?.name_i18n[locale] ?? cat?.slug}
                    </p>
                  </div>
                  {b.price_band && (
                    <span className="text-xs text-muted-foreground">
                      {'€'.repeat(b.price_band)}
                    </span>
                  )}
                  <Badge variant={b.verified ? 'default' : 'secondary'}>
                    {b.verified
                      ? locale === 'en'
                        ? 'verified'
                        : 'εγκεκριμένη'
                      : locale === 'en'
                        ? 'pending'
                        : 'εκκρεμεί'}
                  </Badge>
                  <Badge variant={b.active ? 'outline' : 'secondary'}>
                    {b.active
                      ? locale === 'en'
                        ? 'active'
                        : 'ενεργή'
                      : locale === 'en'
                        ? 'inactive'
                        : 'ανενεργή'}
                  </Badge>
                  <Button asChild={false} variant="outline" size="sm">
                    <Link href={`/admin/businesses/${b.id}`}>
                      {locale === 'en' ? 'Edit' : 'Επεξεργασία'}
                    </Link>
                  </Button>
                </li>
              );
            })}
            {(!businesses || businesses.length === 0) && (
              <li className="p-6 text-sm text-muted-foreground">
                {locale === 'en' ? 'No businesses yet.' : 'Καμία εγγραφή ακόμη.'}
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

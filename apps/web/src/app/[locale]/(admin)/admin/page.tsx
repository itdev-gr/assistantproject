import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Badge, Button, Card, CardContent } from '@aga/ui';
import { ReindexKnowledgeButton } from '@/components/admin/ReindexKnowledgeButton';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function TenantsListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, slug, name, subscription_tier, active, default_locale, created_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{locale === 'en' ? 'Hotels' : 'Καταλύματα'}</h1>
        <div className="flex items-center gap-2">
          <ReindexKnowledgeButton locale={locale} />
          <Button asChild>
            <Link href="/admin/new-tenant">{locale === 'en' ? 'New tenant' : 'Νέο κατάλυμα'}</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {hotels?.map((h) => (
              <li key={h.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{h.name}</p>
                  <p className="truncate text-xs text-muted-foreground">/h/{h.slug}</p>
                </div>
                <Badge variant="outline">{h.subscription_tier}</Badge>
                <Badge variant={h.active ? 'default' : 'secondary'}>
                  {h.active
                    ? locale === 'en'
                      ? 'active'
                      : 'ενεργό'
                    : locale === 'en'
                      ? 'inactive'
                      : 'ανενεργό'}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/tenants/${h.id}`}>
                    {locale === 'en' ? 'Edit' : 'Επεξεργασία'}
                  </Link>
                </Button>
              </li>
            ))}
            {(!hotels || hotels.length === 0) && (
              <li className="p-6 text-sm text-muted-foreground">
                {locale === 'en' ? 'No hotels yet.' : 'Καμία εγγραφή ακόμη.'}
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

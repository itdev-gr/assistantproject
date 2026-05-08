import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function UsagePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: hotels }, { count: msgs30d }, { count: sessions30d }, { count: needsStaff }] =
    await Promise.all([
      supabase.from('hotels').select('id, name').order('name'),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabase
        .from('guest_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', since),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('needs_staff', true),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{locale === 'en' ? 'Usage' : 'Χρήση'}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          title={locale === 'en' ? 'Messages (30d)' : 'Μηνύματα (30 ημ.)'}
          value={msgs30d ?? 0}
        />
        <Stat
          title={locale === 'en' ? 'Sessions (30d)' : 'Σύνοδοι (30 ημ.)'}
          value={sessions30d ?? 0}
        />
        <Stat
          title={locale === 'en' ? 'Pending staff requests' : 'Αναμένουν προσωπικό'}
          value={needsStaff ?? 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'en' ? 'Per hotel' : 'Ανά κατάλυμα'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {hotels?.map((h) => (
              <li key={h.id} className="flex items-center gap-3 p-4 text-sm">
                <span className="flex-1">{h.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {locale === 'en' ? 'view audit log →' : 'προβολή αρχείου →'}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

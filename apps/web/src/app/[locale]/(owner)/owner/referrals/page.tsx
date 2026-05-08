import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@aga/ui';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function OwnerReferralsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Pull referrals via the partnerships join scoped to this hotel; RLS already
  // restricts a hotel owner to their own rows.
  const { data: referrals } = await supabase
    .from('referrals')
    .select(
      `
        id, shown_at, clicked_at,
        partnership:partnerships!inner ( hotel_id, commission_pct,
          business:businesses ( id, name )
        )
      `,
    )
    .eq('partnership.hotel_id', ctx.hotelId)
    .gte('shown_at', since90)
    .order('shown_at', { ascending: false })
    .limit(200);

  const rows = (referrals ?? []) as unknown as Array<{
    id: string;
    shown_at: string;
    clicked_at: string | null;
    partnership: {
      hotel_id: string;
      commission_pct: number;
      business: { id: string; name: string };
    };
  }>;

  const total30 = rows.filter((r) => r.shown_at >= since30).length;
  const clicks30 = rows.filter((r) => r.clicked_at && r.clicked_at >= since30).length;
  const ctr30 = total30 === 0 ? 0 : Math.round((clicks30 / total30) * 100);

  const byPartner = new Map<string, { name: string; shown: number; clicked: number }>();
  for (const r of rows) {
    const id = r.partnership.business.id;
    const cur = byPartner.get(id) ?? {
      name: r.partnership.business.name,
      shown: 0,
      clicked: 0,
    };
    cur.shown += 1;
    if (r.clicked_at) cur.clicked += 1;
    byPartner.set(id, cur);
  }
  const topPartners = [...byPartner.values()]
    .sort((a, b) => b.clicked - a.clicked || b.shown - a.shown)
    .slice(0, 5);

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('Referrals', 'Παραπομπές')}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title={t('Cards shown (30d)', 'Εμφανίσεις (30 ημ.)')} value={total30} />
        <Stat title={t('Clicks (30d)', 'Κλικ (30 ημ.)')} value={clicks30} />
        <Stat title={t('Click-through rate', 'Ποσοστό κλικ')} value={`${ctr30}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Top partners (90 days)', 'Κορυφαίοι συνεργάτες (90 ημ.)')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topPartners.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t('Nothing yet — guests will start clicking soon.', 'Καμία ενέργεια ακόμη.')}
            </p>
          ) : (
            <ul className="divide-y">
              {topPartners.map((p, i) => (
                <li key={p.name + i} className="flex items-center gap-4 p-4">
                  <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.clicked} / {p.shown}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Recent referrals', 'Πρόσφατες παραπομπές')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t('No referrals yet.', 'Καμία παραπομπή ακόμη.')}
            </p>
          ) : (
            <ul className="divide-y">
              {rows.slice(0, 50).map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="flex-1 truncate font-medium">
                    {r.partnership.business.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.shown_at).toLocaleString(locale === 'en' ? 'en-GB' : 'el-GR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <Badge variant={r.clicked_at ? 'default' : 'secondary'}>
                    {r.clicked_at ? t('clicked', 'κλικ') : t('shown', 'προβολή')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </CardContent>
    </Card>
  );
}

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@aga/ui';
import { ModerationActions } from '@/components/admin/ModerationActions';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ModerationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const t = await getTranslations('admin.moderation');
  const supabase = await getServerClient();

  const [{ data: pendingFaqs }, { data: pendingBusinesses }] = await Promise.all([
    supabase
      .from('faqs')
      .select('id, locale, question, answer, hotel:hotels(name)')
      .eq('state', 'draft')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('businesses')
      .select('id, name, description_i18n, address')
      .eq('verified', false)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const total = (pendingFaqs?.length ?? 0) + (pendingBusinesses?.length ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {locale === 'en' ? 'Moderation queue' : 'Έλεγχος περιεχομένου'}
      </h1>

      {total === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t('queueEmpty')}</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>FAQs ({pendingFaqs?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {pendingFaqs?.map((f) => {
                  const hotelName =
                    (f.hotel as unknown as { name?: string } | null)?.name ?? '—';
                  return (
                    <li key={f.id} className="space-y-2 p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase">
                          {f.locale}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{hotelName}</span>
                      </div>
                      <p className="text-sm font-medium">{f.question}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</p>
                      <ModerationActions kind="faq" id={f.id} locale={locale} />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {locale === 'en' ? 'Unverified businesses' : 'Μη εγκεκριμένες επιχειρήσεις'} (
                {pendingBusinesses?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {pendingBusinesses?.map((b) => {
                  const desc =
                    (b.description_i18n as Record<string, string> | null)?.[locale] ??
                    (b.description_i18n as Record<string, string> | null)?.en ??
                    '';
                  return (
                    <li key={b.id} className="space-y-2 p-4">
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.address}</p>
                      {desc && <p className="text-sm">{desc}</p>}
                      <ModerationActions kind="business" id={b.id} locale={locale} />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

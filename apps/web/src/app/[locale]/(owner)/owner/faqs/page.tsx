import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Button, Badge, Card, CardContent } from '@aga/ui';
import { FaqRowActions } from '@/components/owner/FaqRowActions';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function FaqsListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const t = await getTranslations('owner.common');
  const supabase = await getServerClient();

  const { data: faqs } = await supabase
    .from('faqs')
    .select('id, locale, question, state, intent_slug, updated_at')
    .eq('hotel_id', ctx.hotelId)
    .order('updated_at', { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FAQs</h1>
        <Button asChild>
          <Link href="/owner/faqs/new">
            {locale === 'en' ? 'New FAQ' : 'Νέα ερώτηση'}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {(!faqs || faqs.length === 0) && (
            <p className="p-6 text-sm text-muted-foreground">
              {locale === 'en'
                ? 'No FAQs yet. Add your first one to teach the assistant.'
                : 'Καμία ερώτηση ακόμη. Προσθέστε την πρώτη για να εκπαιδεύσετε τον assistant.'}
            </p>
          )}
          <ul className="divide-y">
            {faqs?.map((f) => (
              <li key={f.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase">
                      {f.locale}
                    </Badge>
                    <Badge variant={f.state === 'published' ? 'default' : 'secondary'}>
                      {f.state === 'published' ? t('published') : t('draft')}
                    </Badge>
                    {f.intent_slug && (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {f.intent_slug}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm">{f.question}</p>
                </div>
                <FaqRowActions
                  id={f.id}
                  published={f.state === 'published'}
                  editHref={`/owner/faqs/${f.id}`}
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

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Button } from '@aga/ui';
import { FaqRowActions } from '@/components/owner/FaqRowActions';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

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
      <PageHeader
        title="FAQs"
        subtitle={
          locale === 'en'
            ? 'The questions and answers the assistant learns from.'
            : 'Οι ερωτήσεις και απαντήσεις από τις οποίες μαθαίνει ο βοηθός.'
        }
        actions={
          <Button asChild>
            <Link href="/owner/faqs/new">{locale === 'en' ? 'New FAQ' : 'Νέα ερώτηση'}</Link>
          </Button>
        }
      />

      <TableFrame minWidth="min-w-[560px]">
        {!faqs || faqs.length === 0 ? (
          <EmptyState
            message={
              locale === 'en'
                ? 'No FAQs yet. Add your first one to teach the assistant.'
                : 'Καμία ερώτηση ακόμη. Προσθέστε την πρώτη για να εκπαιδεύσετε τον assistant.'
            }
          />
        ) : (
          faqs.map((f) => (
            <div key={f.id} className={`flex items-center gap-4 px-4 py-3 ${tableRow}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Pill tone="info" className="uppercase">
                    {f.locale}
                  </Pill>
                  <Pill tone={f.state === 'published' ? 'ok' : 'warn'}>
                    {f.state === 'published' ? t('published') : t('draft')}
                  </Pill>
                  {f.intent_slug && (
                    <Pill tone="muted" className="font-mono text-[10px]">
                      {f.intent_slug}
                    </Pill>
                  )}
                </div>
                <p className="mt-1 truncate text-[14px]">{f.question}</p>
              </div>
              <FaqRowActions
                id={f.id}
                published={f.state === 'published'}
                editHref={`/owner/faqs/${f.id}`}
                locale={locale}
              />
            </div>
          ))
        )}
      </TableFrame>
    </div>
  );
}

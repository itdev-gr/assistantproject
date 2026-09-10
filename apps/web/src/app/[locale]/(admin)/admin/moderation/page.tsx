import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { ModerationActions } from '@/components/admin/ModerationActions';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ModerationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const t = await getTranslations('admin.moderation');
  const supabase = await getServerClient();

  const [{ data: pendingFaqs }] = await Promise.all([
    supabase
      .from('faqs')
      .select('id, locale, question, answer, hotel:hotels(name)')
      .eq('state', 'draft')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const total = pendingFaqs?.length ?? 0;
  const tt = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div>
      <PageHeader
        title={tt('Moderation queue', 'Έλεγχος περιεχομένου')}
        subtitle={tt(
          'Draft FAQs waiting for review. Business listings are approved under Businesses.',
          'Πρόχειρες ερωτήσεις προς έλεγχο. Οι επιχειρήσεις εγκρίνονται στη σελίδα Επιχειρήσεις.',
        )}
      />

      {total === 0 ? (
        <TableFrame minWidth="min-w-0">
          <EmptyState message={t('queueEmpty')} />
        </TableFrame>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-primary">
              FAQs ({pendingFaqs?.length ?? 0})
            </h2>
            <TableFrame minWidth="min-w-0">
              {pendingFaqs?.map((f) => {
                const hotelName = (f.hotel as unknown as { name?: string } | null)?.name ?? '—';
                return (
                  <div key={f.id} className={`space-y-2 px-4 py-4 ${tableRow}`}>
                    <div className="flex items-center gap-2">
                      <Pill tone="info" className="uppercase">
                        {f.locale}
                      </Pill>
                      <span className="text-xs text-muted-foreground">{hotelName}</span>
                    </div>
                    <p className="text-[14px] font-medium">{f.question}</p>
                    <p className="whitespace-pre-wrap text-[14px] text-muted-foreground">
                      {f.answer}
                    </p>
                    <ModerationActions kind="faq" id={f.id} locale={locale} />
                  </div>
                );
              })}
            </TableFrame>
          </section>

        </div>
      )}
    </div>
  );
}

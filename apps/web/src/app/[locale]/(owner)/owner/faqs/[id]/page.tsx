import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { FaqForm } from '@/components/owner/FaqForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditFaqPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const { data } = await supabase
    .from('faqs')
    .select('id, locale, question, answer, tags, intent_slug, state')
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={locale === 'en' ? 'Edit FAQ' : 'Επεξεργασία ερώτησης'}
        backHref="/owner/faqs"
        backLabel={locale === 'en' ? 'FAQs' : 'FAQs'}
      />
      <div className="rounded-lg border bg-card p-6">
        <FaqForm
        locale={locale}
        initial={{
          id: data.id,
          locale: data.locale as 'el' | 'en',
          question: data.question,
          answer: data.answer,
          tags: data.tags ?? [],
          intentSlug: data.intent_slug,
          published: data.state === 'published',
        }}
        />
      </div>
    </div>
  );
}

import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { FaqForm } from '@/components/owner/FaqForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function NewFaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={locale === 'en' ? 'New FAQ' : 'Νέα ερώτηση'}
        backHref="/owner/faqs"
        backLabel={locale === 'en' ? 'FAQs' : 'FAQs'}
      />
      <div className="rounded-lg border bg-card p-6">
        <FaqForm
        locale={locale}
        initial={{
          locale: locale === 'en' ? 'en' : 'el',
          question: '',
          answer: '',
          tags: [],
          intentSlug: null,
          published: false,
        }}
        />
      </div>
    </div>
  );
}

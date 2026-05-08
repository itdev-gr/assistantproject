import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { FaqForm } from '@/components/owner/FaqForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function NewFaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'New FAQ' : 'Νέα ερώτηση'}
      </h1>
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
  );
}

import { setRequestLocale } from 'next-intl/server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { NewTenantForm } from '@/components/admin/NewTenantForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function NewTenantPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'New tenant' : 'Νέο κατάλυμα'}
      </h1>
      <NewTenantForm locale={locale} />
    </div>
  );
}

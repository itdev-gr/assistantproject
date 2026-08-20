import { setRequestLocale } from 'next-intl/server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { NewTenantForm } from '@/components/admin/NewTenantForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function NewTenantPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={locale === 'en' ? 'New tenant' : 'Νέο κατάλυμα'}
        backHref="/admin"
        backLabel={locale === 'en' ? 'Hotels' : 'Καταλύματα'}
      />
      <div className="rounded-lg border bg-card p-6">
        <NewTenantForm locale={locale} />
      </div>
    </div>
  );
}

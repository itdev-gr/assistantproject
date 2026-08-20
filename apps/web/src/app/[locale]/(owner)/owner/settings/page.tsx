import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { Input, Label } from '@aga/ui';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ChangePasswordForm } from '@/components/owner/ChangePasswordForm';
import { SignOutButton } from '@/components/owner/SignOutButton';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function OwnerSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('Settings', 'Ρυθμίσεις')} />

      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold text-primary">{t('Account', 'Λογαριασμός')}</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={ctx.email} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{t('Role', 'Ρόλος')}</Label>
            <Input value={ctx.role} readOnly disabled />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold text-primary">
          {t('Change password', 'Αλλαγή κωδικού')}
        </h2>
        <ChangePasswordForm locale={locale} />
      </section>

      <section className="mt-6 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold text-primary">{t('Session', 'Συνεδρία')}</h2>
        <SignOutButton locale={locale} />
      </section>
    </div>
  );
}

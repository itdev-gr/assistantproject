import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@aga/ui';
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
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('Settings', 'Ρυθμίσεις')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('Account', 'Λογαριασμός')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={ctx.email} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{t('Role', 'Ρόλος')}</Label>
            <Input value={ctx.role} readOnly disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Change password', 'Αλλαγή κωδικού')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Session', 'Συνεδρία')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignOutButton locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}

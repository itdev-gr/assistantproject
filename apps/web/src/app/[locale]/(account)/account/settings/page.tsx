import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { requireUser } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { ProfileForm } from '@/components/account/ProfileForm';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AccountSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireUser('/account/settings');
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const supabase = await getServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, locale')
    .eq('id', ctx.userId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{t('Settings', 'Ρυθμίσεις')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Your profile and sign-in details.', 'Το προφίλ και τα στοιχεία εισόδου σας.')}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Profile', 'Προφίλ')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            locale={locale}
            userId={ctx.userId}
            email={ctx.email}
            initial={{
              displayName: profile?.display_name ?? null,
              avatarUrl: profile?.avatar_url ?? null,
              locale: profile?.locale === 'en' ? 'en' : 'el',
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Password', 'Κωδικός')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}

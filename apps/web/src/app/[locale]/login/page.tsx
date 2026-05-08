import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string; sent?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{locale === 'en' ? 'Sign in' : 'Είσοδος'}</CardTitle>
        </CardHeader>
        <CardContent>
          {sp.sent ? (
            <p className="text-sm text-muted-foreground">
              {locale === 'en'
                ? 'Check your email for a sign-in link.'
                : 'Ελέγξτε το email σας για τον σύνδεσμο εισόδου.'}
            </p>
          ) : (
            <LoginForm next={sp.next} locale={locale} />
          )}
          {sp.error && <p className="mt-3 text-xs text-destructive">{sp.error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}

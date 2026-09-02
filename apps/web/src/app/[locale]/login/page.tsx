import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string; sent?: string }>;
}

const ERROR_TEXT: Record<string, { en: string; el: string }> = {
  no_hotel: {
    en: 'Your account is not linked to a property yet.',
    el: 'Ο λογαριασμός σας δεν είναι ακόμη συνδεδεμένος με κατάλυμα.',
  },
  missing_code: {
    en: 'The sign-in link is invalid or has expired. Request a new one below.',
    el: 'Ο σύνδεσμος εισόδου δεν είναι έγκυρος ή έχει λήξει. Ζητήστε νέο παρακάτω.',
  },
};

function errorMessage(code: string, locale: string): string {
  const known = ERROR_TEXT[code];
  if (known) return locale === 'en' ? known.en : known.el;
  return code;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4">
      <Link href={`/${locale}`} className="mb-8">
        <img src="/brand/roomriv-stacked-plain.svg" alt="Roomriv" className="h-24 w-auto" />
      </Link>
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
          {sp.error && (
            <p role="alert" className="mt-3 text-xs text-destructive">
              {errorMessage(sp.error, locale)}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthShell } from '@/components/auth/AuthShell';

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
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <AuthShell
      locale={locale}
      variant="login"
      title={t('Sign in', 'Είσοδος')}
      subtitle={t(
        'Use your password or get a one-time link by email.',
        'Με τον κωδικό σας ή με σύνδεσμο μίας χρήσης στο email σας.',
      )}
    >
      {sp.error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage(sp.error, locale)}
        </p>
      )}
      {sp.sent ? (
        <p className="text-sm text-muted-foreground">
          {t(
            'Check your email for a sign-in link.',
            'Ελέγξτε το email σας για τον σύνδεσμο εισόδου.',
          )}
        </p>
      ) : (
        <LoginForm next={sp.next} locale={locale} />
      )}
    </AuthShell>
  );
}

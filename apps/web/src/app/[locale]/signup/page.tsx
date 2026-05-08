import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { SignupForm } from '@/components/auth/SignupForm';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{locale === 'en' ? 'Create account' : 'Δημιουργία λογαριασμού'}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm next={sp.next} locale={locale} />
        </CardContent>
      </Card>
    </main>
  );
}

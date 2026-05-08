import { setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function MarketingHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">AI Guest Assistant</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        Curated answers and trusted local recommendations for guests of partner hotels and short-term
        rentals.
      </p>
    </main>
  );
}

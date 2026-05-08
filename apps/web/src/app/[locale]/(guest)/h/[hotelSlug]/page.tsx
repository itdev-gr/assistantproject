import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { GuestChat } from '@/components/guest/GuestChat';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { BusinessCard } from '@/components/public/BusinessCard';
import { listHotelDirectory } from '@/lib/hotel-directory';
import { Card, CardContent } from '@aga/ui';

interface Props {
  params: Promise<{ locale: string; hotelSlug: string }>;
  searchParams: Promise<{ room?: string }>;
}

export default async function GuestHotelPage({ params, searchParams }: Props) {
  const { locale, hotelSlug } = await params;
  const { room } = await searchParams;
  setRequestLocale(locale);
  if (!hotelSlug) notFound();

  const data = await listHotelDirectory(hotelSlug, locale === 'en' ? 'en' : 'el');
  if (!data) notFound();
  const { hotel, partners, others } = data;

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader locale={locale} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('Welcome to', 'Καλώς ήρθατε στο')}
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">{hotel.name}</h1>
            {room && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`Room ${room}`, `Δωμάτιο ${room}`)}
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {partners.length > 0 && (
              <section>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">
                    {t('Recommended by the hotel', 'Προτεινόμενα από το ξενοδοχείο')}
                  </h2>
                  <p className="text-xs text-muted-foreground">{partners.length}</p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {partners.map((b) => (
                    <li key={b.id}>
                      <BusinessCard locale={locale} business={b} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {others.length > 0 && (
              <section>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">
                    {t('More places nearby', 'Περισσότερα μέρη κοντά')}
                  </h2>
                  <p className="text-xs text-muted-foreground">{others.length}</p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {others.map((b) => (
                    <li key={b.id}>
                      <BusinessCard locale={locale} business={b} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {partners.length === 0 && others.length === 0 && (
              <p className="rounded-md border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                {t(
                  'No places listed yet — try the assistant for help.',
                  'Δεν υπάρχουν καταχωρήσεις ακόμη — δοκιμάστε τον assistant.',
                )}
              </p>
            )}
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="h-[600px] overflow-hidden">
              <CardContent className="flex h-full flex-col p-0">
                <div className="border-b px-4 py-3 text-sm font-semibold">
                  {t('Ask the assistant', 'Ρωτήστε τον assistant')}
                </div>
                <GuestChat hotelSlug={hotelSlug} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}

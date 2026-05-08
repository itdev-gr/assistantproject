import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { getBusiness } from '@/lib/public-directory';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { ArrowLeft, ExternalLink, MapPin, Phone, MessageCircle } from 'lucide-react';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

const ICONS: Record<string, string> = {
  restaurants: '🍽️',
  'bars-cafes': '🍸',
  activities: '🥾',
  'boat-trips': '⛵',
  taxis: '🚖',
  shops: '🛍️',
  events: '🎉',
};

export default async function BusinessDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const data = await getBusiness(id, locale === 'en' ? 'en' : 'el');
  if (!data) notFound();
  const { business, hotelPartners } = data;
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${business.name} ${business.address}`,
  )}`;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader locale={locale} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('All places', 'Όλα τα μέρη')}
        </Link>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br from-accent/40 to-muted">
              {business.images[0] ? (
                <img
                  src={business.images[0]}
                  alt={business.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-7xl opacity-50">
                  <span aria-hidden>{ICONS[business.categorySlug] ?? '📍'}</span>
                </div>
              )}
              {business.hasPartner &&
                (business.topTier === 'featured' || business.topTier === 'exclusive') && (
                  <Badge variant="promoted" className="absolute left-3 top-3">
                    {t('Featured', 'Προτεινόμενο')}
                  </Badge>
                )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {business.categoryName}
              </p>
              <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{business.name}</h1>
              {business.priceBand != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {'€'.repeat(business.priceBand)} · {t('Price level', 'Επίπεδο τιμής')}
                </p>
              )}
            </div>

            {business.description && (
              <p className="text-base text-foreground/90 whitespace-pre-line">
                {business.description}
              </p>
            )}

            {business.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {business.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Contact', 'Επικοινωνία')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                  <a
                    className="hover:underline"
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {business.address}
                  </a>
                </div>
                {business.phone && (
                  <div className="flex gap-2">
                    <Phone
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <a className="hover:underline" href={`tel:${business.phone}`}>
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.whatsapp && (
                  <div className="flex gap-2">
                    <MessageCircle
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <a
                      className="hover:underline"
                      href={`https://wa.me/${business.whatsapp.replace(/[^+\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              {business.website && (
                <Button asChild>
                  <a href={business.website} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    {t('Visit website', 'Επίσκεψη ιστοσελίδας')}
                  </a>
                </Button>
              )}
              {business.phone && (
                <Button asChild variant="outline">
                  <a href={`tel:${business.phone}`}>
                    <Phone className="h-4 w-4" aria-hidden />
                    {t('Call', 'Κλήση')}
                  </a>
                </Button>
              )}
              <Button asChild variant="outline">
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {t('Open in Maps', 'Άνοιγμα στο Maps')}
                </a>
              </Button>
            </div>

            {hotelPartners.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('Recommended by', 'Προτείνεται από')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {hotelPartners.map((h) => (
                      <li key={h.slug}>
                        <Link
                          href={`/h/${h.slug}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {h.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}

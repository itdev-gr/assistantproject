import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { PageMotion } from '@/components/public/motion';
import { PlanCard } from '@/components/public/pricing/PlanCard';
import { BUSINESS_AUDIENCE, PLANS, formatEuro } from '@/lib/plans';
import {
  HOTEL_PLANS,
  LAUNCH_OFFER_CENTS,
  LAUNCH_OFFER_LIMIT,
  isLaunchOfferEligible,
} from '@/lib/hotel-plans';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const en = locale === 'en';
  const title = en ? 'Pricing — RoomRiv' : 'Τιμές — RoomRiv';
  const description = en
    ? 'Yearly packages for hotels, small accommodation and local businesses that want to reach hotel guests across Greece. Booking commission up to 10%, only on bookings made through RoomRiv.'
    : 'Ετήσια πακέτα για ξενοδοχεία, μικρά καταλύματα και τοπικές επιχειρήσεις που θέλουν να φτάσουν σε επισκέπτες ξενοδοχείων σε όλη την Ελλάδα. Προμήθεια κρατήσεων έως 10%, μόνο σε κρατήσεις μέσω RoomRiv.';
  return {
    title,
    description,
    alternates: {
      canonical: en ? '/en/pricing' : '/pricing',
      languages: { el: '/pricing', en: '/en/pricing', 'x-default': '/pricing' },
    },
    openGraph: {
      type: 'website',
      siteName: 'RoomRiv',
      locale: en ? 'en_US' : 'el_GR',
      title,
      description,
    },
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const en = locale === 'en';
  const t = (enText: string, elText: string) => (en ? enText : elText);
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const contactCta = contactEmail
    ? {
        href: `mailto:${contactEmail}?subject=${encodeURIComponent('RoomRiv hotel package')}`,
        label: t('Contact us', 'Επικοινωνήστε μαζί μας'),
        external: true,
      }
    : { href: '/about', label: t('Contact us', 'Επικοινωνήστε μαζί μας') };

  const hotelPlans = HOTEL_PLANS.filter((p) => p.audience === 'hotel');
  const accommodationPlans = HOTEL_PLANS.filter((p) => p.audience === 'accommodation');
  const launchPrice = formatEuro(LAUNCH_OFFER_CENTS, locale);

  const faq = [
    {
      q: t(
        'Is the subscription the same as the commission?',
        'Η συνδρομή είναι το ίδιο με την προμήθεια;',
      ),
      a: t(
        'No — they are separate charges. The yearly subscription covers your presence and participation in the RoomRiv network. The commission (up to 10%, agreed per partnership) applies only to bookings that are generated through RoomRiv, and is invoiced separately.',
        'Όχι — είναι ξεχωριστές χρεώσεις. Η ετήσια συνδρομή αφορά την παρουσία και συμμετοχή σας στο δίκτυο RoomRiv. Η προμήθεια (έως 10%, όπως συμφωνείται ανά συνεργασία) αφορά αποκλειστικά τις κρατήσεις που δημιουργούνται μέσω RoomRiv και τιμολογείται ξεχωριστά.',
      ),
    },
    {
      q: t('How does the launch offer work?', 'Πώς λειτουργεί η προσφορά έναρξης;'),
      a: t(
        `The first ${LAUNCH_OFFER_LIMIT} hotels that join RoomRiv pay ${launchPrice} for their first year, whichever package they choose. From the second year the normal price of that package applies. Slots are assigned in order of payment.`,
        `Τα πρώτα ${LAUNCH_OFFER_LIMIT} ξενοδοχεία που εγγράφονται στο RoomRiv πληρώνουν ${launchPrice} για τον πρώτο χρόνο, όποιο πακέτο κι αν επιλέξουν. Από τον δεύτερο χρόνο ισχύει η κανονική τιμή του πακέτου. Οι θέσεις δίνονται με σειρά πληρωμής.`,
      ),
    },
    {
      q: t(
        'When does my business listing go live?',
        'Πότε δημοσιεύεται η καταχώριση της επιχείρησής μου;',
      ),
      a: t(
        'As soon as two things are true: your subscription is active and our team has reviewed the listing. Reviews usually take a few working days; you can complete photos and opening hours in the meantime.',
        'Μόλις ισχύουν δύο πράγματα: η συνδρομή σας είναι ενεργή και η ομάδα μας έχει ελέγξει την καταχώριση. Ο έλεγχος συνήθως θέλει λίγες εργάσιμες· στο μεταξύ μπορείτε να συμπληρώσετε φωτογραφίες και ωράρια.',
      ),
    },
    {
      q: t('Do plans change the order of the guide?', 'Αλλάζουν τα πλάνα τη σειρά του οδηγού;'),
      a: t(
        'No. Nobody can buy their way in or above anyone else in the directory. Premium Partner adds a badge, a place in the homepage strip, and more weight in the AI assistant’s suggestions — but only among places that are already relevant to what the guest asked.',
        'Όχι. Κανείς δεν αγοράζει θέση ή σειρά στον κατάλογο. Το Premium Partner προσθέτει σήμα, θέση στα προτεινόμενα της αρχικής και μεγαλύτερο βάρος στις προτάσεις του AI βοηθού — μόνο όμως ανάμεσα σε μέρη που είναι ήδη σχετικά με ό,τι ρώτησε ο επισκέπτης.',
      ),
    },
    {
      q: t('How do I pay and cancel?', 'Πώς πληρώνω και πώς ακυρώνω;'),
      a: t(
        'Payments run through Stripe with any card, once a year. Invoices arrive by email and are always available in your dashboard. Cancel anytime from the Stripe portal; you keep access until the end of the paid year.',
        'Οι πληρωμές γίνονται μέσω Stripe με οποιαδήποτε κάρτα, μία φορά τον χρόνο. Τα τιμολόγια έρχονται με email και είναι πάντα διαθέσιμα στον πίνακά σας. Ακυρώνετε όποτε θέλετε από το portal της Stripe· διατηρείτε την πρόσβαση έως το τέλος του πληρωμένου έτους.',
      ),
    },
    {
      q: t('Do hotel guests pay anything?', 'Πληρώνουν κάτι οι επισκέπτες;'),
      a: t(
        'Never. Guests use the guide and the assistant for free and contact businesses directly — no booking fees for them, no middlemen.',
        'Ποτέ. Οι επισκέπτες χρησιμοποιούν τον οδηγό και τον βοηθό δωρεάν και επικοινωνούν απευθείας με τις επιχειρήσεις — χωρίς χρεώσεις κράτησης για εκείνους, χωρίς μεσάζοντες.',
      ),
    },
  ];

  const sectionTitle = (title: string, sub: string) => (
    <div className="mb-8 max-w-2xl">
      <h2 className="font-serif text-3xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm sm:text-base">{sub}</p>
    </div>
  );

  return (
    <PageMotion>
      <div className="bg-background flex min-h-dvh flex-col">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <section className="to-background border-b bg-gradient-to-b from-sky-50">
            <div className="mx-auto max-w-6xl px-4 py-14 text-center md:py-20">
              <p className="text-primary mb-3 text-xs font-medium uppercase tracking-[0.2em]">
                {t('Pricing', 'Τιμές')}
              </p>
              <h1 className="mx-auto max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                {t(
                  'Plans for hotels, small stays and local businesses.',
                  'Πλάνα για ξενοδοχεία, καταλύματα και τοπικές επιχειρήσεις.',
                )}
              </h1>
              <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base sm:text-lg">
                {t(
                  'Yearly packages, VAT included. The subscription covers your place in the RoomRiv network; booking commission is separate and applies only to bookings made through RoomRiv.',
                  'Ετήσια πακέτα, με ΦΠΑ. Η συνδρομή αφορά τη θέση σας στο δίκτυο RoomRiv· η προμήθεια κρατήσεων είναι ξεχωριστή και ισχύει μόνο για κρατήσεις μέσω RoomRiv.',
                )}
              </p>
            </div>
          </section>

          {/* Hotels */}
          <section id="hotels" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            {sectionTitle(
              t('Hotels', 'Ξενοδοχεία'),
              t(
                'Your own AI guest assistant, dashboard and curated local guide. Hotels are set up by our team — get in touch and we will activate your account.',
                'Ο δικός σας AI βοηθός επισκεπτών, dashboard και επιμελημένος τοπικός οδηγός. Τα ξενοδοχεία ενεργοποιούνται από την ομάδα μας — επικοινωνήστε και θα ενεργοποιήσουμε τον λογαριασμό σας.',
              ),
            )}
            <div
              data-testid="launch-offer"
              className="border-gold/60 bg-gold/10 mb-8 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center"
            >
              <Sparkles className="text-deep-ink h-6 w-6 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">
                  {t(
                    `First ${LAUNCH_OFFER_LIMIT} hotels — launch offer`,
                    `Τα πρώτα ${LAUNCH_OFFER_LIMIT} ξενοδοχεία — προσφορά έναρξης`,
                  )}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t(
                    `Special price: ${launchPrice} / year for the first year, for the first ${LAUNCH_OFFER_LIMIT} hotels that register on RoomRiv, whichever package they choose. From the second year the normal price of the package applies.`,
                    `Ειδική τιμή: ${launchPrice} / έτος για τον πρώτο χρόνο, για τα πρώτα ${LAUNCH_OFFER_LIMIT} ξενοδοχεία που θα εγγραφούν στο RoomRiv, ανεξάρτητα από την κατηγορία τους. Μετά τον πρώτο χρόνο εφαρμόζεται η κανονική τιμή του αντίστοιχου πακέτου.`,
                  )}
                </p>
              </div>
            </div>
            <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {hotelPlans.map((p) => (
                <PlanCard
                  key={p.plan}
                  locale={locale}
                  testId={`hotel-plan-${p.plan}`}
                  name={en ? p.name.en : p.name.el}
                  tagline={en ? p.tagline.en : p.tagline.el}
                  cents={p.cents}
                  features={p.features}
                  highlight={p.highlight}
                  badge={p.highlight ? t('Most popular', 'Δημοφιλέστερο') : undefined}
                  priceNote={
                    isLaunchOfferEligible(p.plan)
                      ? t(
                          `Launch offer: ${launchPrice} the first year`,
                          `Προσφορά έναρξης: ${launchPrice} τον πρώτο χρόνο`,
                        )
                      : undefined
                  }
                  cta={contactCta}
                />
              ))}
            </ul>
          </section>

          {/* Small accommodation */}
          <section id="accommodation" className="bg-muted/30 border-t">
            <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
              {sectionTitle(
                t('Small accommodation', 'Μικρά καταλύματα'),
                t(
                  'The same assistant and dashboard, sized for Airbnb, apartments, studios, villas and small independent units.',
                  'Ο ίδιος βοηθός και dashboard, για Airbnb, apartments, studios, villas και μικρές ανεξάρτητες μονάδες.',
                ),
              )}
              <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {accommodationPlans.map((p) => (
                  <PlanCard
                    key={p.plan}
                    locale={locale}
                    testId={`hotel-plan-${p.plan}`}
                    name={en ? p.name.en : p.name.el}
                    tagline={en ? p.tagline.en : p.tagline.el}
                    cents={p.cents}
                    features={p.features}
                    cta={contactCta}
                  />
                ))}
              </ul>
            </div>
          </section>

          {/* Businesses */}
          <section id="businesses" className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            {sectionTitle(
              t('Businesses', 'Επιχειρήσεις'),
              en ? BUSINESS_AUDIENCE.en : BUSINESS_AUDIENCE.el,
            )}
            <ul className="grid gap-6 md:grid-cols-2 xl:max-w-4xl">
              {PLANS.map((p) => (
                <PlanCard
                  key={p.tier}
                  locale={locale}
                  testId={`plan-${p.tier}`}
                  name={en ? p.name.en : p.name.el}
                  tagline={en ? p.tagline.en : p.tagline.el}
                  cents={p.cents}
                  features={p.features}
                  highlight={p.highlight}
                  badge={p.highlight ? t('Most popular', 'Δημοφιλέστερο') : undefined}
                  cta={{
                    href: `/signup?role=partner&plan=${p.tier}`,
                    label: `${t('Choose', 'Επιλογή')} ${en ? p.name.en : p.name.el}`,
                  }}
                />
              ))}
            </ul>
            <p className="text-muted-foreground mt-6 text-xs">
              {t(
                'Your listing is published after payment and a review by our team. Already a partner? Manage your plan from your dashboard.',
                'Η καταχώριση δημοσιεύεται μετά την πληρωμή και τον έλεγχο από την ομάδα μας. Είστε ήδη συνεργάτης; Διαχειριστείτε το πλάνο σας από τον πίνακά σας.',
              )}{' '}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                {t('Sign in', 'Είσοδος')}
              </Link>
            </p>
          </section>

          {/* Commission */}
          <section id="commission" data-testid="commission" className="bg-muted/30 border-t">
            <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
              {sectionTitle(
                t('Booking commission', 'Προμήθεια κρατήσεων'),
                t('Standard Commission', 'Standard Commission'),
              )}
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <div className="bg-card rounded-2xl border p-6">
                  <p className="text-4xl font-semibold">{t('Up to 10%', 'Έως 10%')}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t('depending on the partnership', 'ανάλογα με τη συνεργασία')}
                  </p>
                </div>
                <ul className="space-y-3 text-sm sm:text-base">
                  <li>
                    {t(
                      'The subscription and the booking commission are separate charges.',
                      'Η συνδρομή και η προμήθεια κράτησης είναι ξεχωριστές χρεώσεις.',
                    )}
                  </li>
                  <li>
                    {t(
                      'The subscription covers the presence and participation of the business in the RoomRiv network.',
                      'Η συνδρομή αφορά την παρουσία και συμμετοχή της επιχείρησης στο δίκτυο RoomRiv.',
                    )}
                  </li>
                  <li>
                    {t(
                      'The commission applies exclusively to bookings that are generated through RoomRiv.',
                      'Η προμήθεια αφορά αποκλειστικά τις κρατήσεις που δημιουργούνται μέσω RoomRiv.',
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="border-t">
            <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
              <h2 className="text-center font-serif text-3xl font-semibold">
                {t('Questions', 'Ερωτήσεις')}
              </h2>
              <dl className="bg-card mt-8 divide-y rounded-xl border">
                {faq.map((item) => (
                  <div key={item.q} className="p-5">
                    <dt className="font-semibold">{item.q}</dt>
                    <dd className="text-muted-foreground mt-1.5 text-sm">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </main>
        <SiteFooter locale={locale} />
      </div>
    </PageMotion>
  );
}

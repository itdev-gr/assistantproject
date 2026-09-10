import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button, cn } from '@aga/ui';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { PageMotion } from '@/components/public/motion';
import { PLANS, formatEuro } from '@/lib/plans';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const en = locale === 'en';
  const title = en ? 'Pricing — Roomriv' : 'Τιμές — Roomriv';
  const description = en
    ? 'Simple monthly plans for restaurants, beaches, activities and local services that want to reach hotel guests across Greece. Cancel anytime.'
    : 'Απλά μηνιαία πλάνα για εστιατόρια, παραλίες, δραστηριότητες και τοπικές υπηρεσίες που θέλουν να φτάσουν σε επισκέπτες ξενοδοχείων σε όλη την Ελλάδα. Ακύρωση όποτε θέλετε.';
  return {
    title,
    description,
    alternates: {
      canonical: en ? '/en/pricing' : '/pricing',
      languages: { el: '/pricing', en: '/en/pricing', 'x-default': '/pricing' },
    },
    openGraph: { type: 'website', siteName: 'Roomriv', locale: en ? 'en_US' : 'el_GR', title, description },
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const en = locale === 'en';
  const t = (enText: string, elText: string) => (en ? enText : elText);

  const faq = [
    {
      q: t('When does my listing go live?', 'Πότε δημοσιεύεται η καταχώρισή μου;'),
      a: t(
        'As soon as two things are true: your subscription is active and our team has reviewed the listing. Reviews usually take a few working days; you can complete photos and opening hours in the meantime.',
        'Μόλις ισχύουν δύο πράγματα: η συνδρομή σας είναι ενεργή και η ομάδα μας έχει ελέγξει την καταχώριση. Ο έλεγχος συνήθως θέλει λίγες εργάσιμες· στο μεταξύ μπορείτε να συμπληρώσετε φωτογραφίες και ωράρια.',
      ),
    },
    {
      q: t('Do plans change the order of the guide?', 'Αλλάζουν τα πλάνα τη σειρά του οδηγού;'),
      a: t(
        'No. Nobody can buy their way in or above anyone else in the directory. Featured and Exclusive add a badge, a place in the homepage strip, and more weight in the AI assistant’s suggestions — but only among places that are already relevant to what the guest asked.',
        'Όχι. Κανείς δεν αγοράζει θέση ή σειρά στον κατάλογο. Τα Featured και Exclusive προσθέτουν σήμα, θέση στα προτεινόμενα της αρχικής και μεγαλύτερο βάρος στις προτάσεις του AI βοηθού — μόνο όμως ανάμεσα σε μέρη που είναι ήδη σχετικά με ό,τι ρώτησε ο επισκέπτης.',
      ),
    },
    {
      q: t('How do I pay and cancel?', 'Πώς πληρώνω και πώς ακυρώνω;'),
      a: t(
        'Payments run through Stripe with any card. Invoices arrive by email and are always available in your dashboard. Cancel or switch plans anytime from the Stripe portal; changes apply immediately.',
        'Οι πληρωμές γίνονται μέσω Stripe με οποιαδήποτε κάρτα. Τα τιμολόγια έρχονται με email και είναι πάντα διαθέσιμα στον πίνακά σας. Ακυρώνετε ή αλλάζετε πλάνο όποτε θέλετε από το portal της Stripe· οι αλλαγές ισχύουν άμεσα.',
      ),
    },
    {
      q: t('Do hotel guests pay anything?', 'Πληρώνουν κάτι οι επισκέπτες;'),
      a: t(
        'Never. Guests use the guide and the assistant for free and contact you directly — no booking fees, no middlemen.',
        'Ποτέ. Οι επισκέπτες χρησιμοποιούν τον οδηγό και τον βοηθό δωρεάν και επικοινωνούν απευθείας μαζί σας — χωρίς προμήθειες κράτησης, χωρίς μεσάζοντες.',
      ),
    },
  ];

  return (
    <PageMotion>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <section className="border-b bg-gradient-to-b from-sky-50 to-background">
            <div className="mx-auto max-w-6xl px-4 py-14 text-center md:py-20">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                {t('Pricing', 'Τιμές')}
              </p>
              <h1 className="mx-auto max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                {t('One plan, every traveller in Greece.', 'Ένα πλάνο, κάθε ταξιδιώτης στην Ελλάδα.')}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t(
                  'Monthly plans for businesses that want to be recommended to hotel guests. Prices include VAT. Cancel anytime.',
                  'Μηνιαία πλάνα για επιχειρήσεις που θέλουν να προτείνονται σε επισκέπτες ξενοδοχείων. Οι τιμές περιλαμβάνουν ΦΠΑ. Ακύρωση όποτε θέλετε.',
                )}
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <ul className="grid gap-6 md:grid-cols-3">
              {PLANS.map((p) => (
                <li
                  key={p.tier}
                  data-testid={`plan-${p.tier}`}
                  className={cn(
                    'relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm',
                    p.highlight && 'border-primary shadow-card-hover ring-1 ring-primary/30',
                  )}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {t('Most popular', 'Δημοφιλέστερο')}
                    </span>
                  )}
                  <h2 className="font-serif text-2xl font-semibold">{en ? p.name.en : p.name.el}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{en ? p.tagline.en : p.tagline.el}</p>
                  <p className="mt-5">
                    <span className="text-4xl font-semibold">{formatEuro(p.cents, locale)}</span>
                    <span className="text-sm text-muted-foreground"> / {t('month', 'μήνα')}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f.en} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span>{en ? f.en : f.el}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild size="lg" className="mt-8" variant={p.highlight ? 'default' : 'outline'}>
                    <Link href={`/signup?role=partner&plan=${p.tier}`}>
                      {t('Choose', 'Επιλογή')} {en ? p.name.en : p.name.el}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {t(
                'Your listing is published after payment and a review by our team. Already a partner? Manage your plan from your dashboard.',
                'Η καταχώριση δημοσιεύεται μετά την πληρωμή και τον έλεγχο από την ομάδα μας. Είστε ήδη συνεργάτης; Διαχειριστείτε το πλάνο σας από τον πίνακά σας.',
              )}{' '}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                {t('Sign in', 'Είσοδος')}
              </Link>
            </p>
          </section>

          <section className="border-t bg-muted/30">
            <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
              <h2 className="text-center font-serif text-3xl font-semibold">{t('Questions', 'Ερωτήσεις')}</h2>
              <dl className="mt-8 divide-y rounded-xl border bg-card">
                {faq.map((item) => (
                  <div key={item.q} className="p-5">
                    <dt className="font-semibold">{item.q}</dt>
                    <dd className="mt-1.5 text-sm text-muted-foreground">{item.a}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 rounded-xl border border-sky-100 bg-sky-50/60 p-5 text-sm">
                <p className="font-medium">{t('Run a hotel or guesthouse?', 'Διαχειρίζεστε ξενοδοχείο ή κατάλυμα;')}</p>
                <p className="mt-1 text-muted-foreground">
                  {t(
                    'Hotels get their own AI guest assistant and dashboard on a separate plan. Get in touch and we will set you up.',
                    'Τα ξενοδοχεία αποκτούν δικό τους AI βοηθό επισκεπτών και dashboard με ξεχωριστό πλάνο. Επικοινωνήστε μαζί μας για την ενεργοποίηση.',
                  )}{' '}
                  <Link href="/about" className="text-primary underline-offset-4 hover:underline">
                    {t('Learn more', 'Μάθετε περισσότερα')}
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter locale={locale} />
      </div>
    </PageMotion>
  );
}

import { Link } from '@/i18n/routing';

interface Props {
  locale: string;
}

/** Business-owner call to action just above the footer. */
export function OwnerCta({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="from-accent to-background border-t bg-gradient-to-r via-sky-50">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            {t('Own a business in Greece?', 'Έχετε επιχείρηση στην Ελλάδα;')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">
            {t(
              'List it in the directory for free. Partner hotels recommend it to their guests through the assistant — and every referral brings customers to your door.',
              'Καταχωρήστε τη δωρεάν στον κατάλογο. Τα συνεργαζόμενα ξενοδοχεία την προτείνουν στους επισκέπτες τους μέσω του βοηθού — και κάθε σύσταση φέρνει πελάτες στην πόρτα σας.',
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href="/signup?role=partner"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring inline-flex h-12 cursor-pointer items-center rounded-lg px-6 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t('List your business', 'Καταχώρηση επιχείρησης')}
          </Link>
          <Link
            href="/about"
            className="border-input bg-background hover:bg-accent/40 focus-visible:outline-ring inline-flex h-12 cursor-pointer items-center rounded-lg border px-5 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t('Learn more', 'Μάθετε περισσότερα')}
          </Link>
        </div>
      </div>
    </section>
  );
}

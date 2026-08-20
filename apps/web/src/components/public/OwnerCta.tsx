import { Link } from '@/i18n/routing';

interface Props {
  locale: string;
}

/** Business-owner call to action just above the footer. */
export function OwnerCta({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="border-t bg-gradient-to-r from-accent via-sky-50 to-background">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            {t('Own a business on the island?', 'Έχετε επιχείρηση στο νησί;')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t(
              'List it in the directory for free. Partner hotels recommend it to their guests through the assistant — and every referral brings customers to your door.',
              'Καταχωρήστε τη δωρεάν στον κατάλογο. Τα συνεργαζόμενα ξενοδοχεία την προτείνουν στους επισκέπτες τους μέσω του βοηθού — και κάθε σύσταση φέρνει πελάτες στην πόρτα σας.',
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 cursor-pointer items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t('List your business', 'Καταχώρηση επιχείρησης')}
          </Link>
          <Link
            href="/about"
            className="inline-flex h-12 cursor-pointer items-center rounded-lg border border-input bg-background px-5 text-sm font-medium transition-colors duration-200 hover:bg-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t('Learn more', 'Μάθετε περισσότερα')}
          </Link>
        </div>
      </div>
    </section>
  );
}

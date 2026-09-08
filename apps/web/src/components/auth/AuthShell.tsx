import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Map, MapPin } from 'lucide-react';
import { cn } from '@aga/ui';
import { PageMotion } from '@/components/public/motion';
import { AuthItem, AuthStagger } from './AuthShellMotion';

export type AuthVariant = 'login' | 'signup' | 'no-access';

interface Props {
  locale: string;
  variant: AuthVariant;
  /** Page heading — rendered as the <h1> above the card. */
  title: string;
  subtitle?: string;
  /** Card width: md for login / no-access, lg for the signup form. */
  width?: 'md' | 'lg';
  children: React.ReactNode;
  /** Rendered under the card (secondary links, sign-out, …). */
  footer?: React.ReactNode;
}

const PHOTOS: Record<AuthVariant, { src: string; alt: { en: string; el: string } }> = {
  login: {
    src: '/images/hero-milos.jpg',
    alt: { en: 'Boats in a turquoise bay on Milos', el: 'Σκάφη σε γαλαζοπράσινο κόλπο της Μήλου' },
  },
  signup: {
    src: '/images/hero-corfu.jpg',
    alt: { en: 'Paleokastritsa beach, Corfu', el: 'Παραλία Παλαιοκαστρίτσας, Κέρκυρα' },
  },
  'no-access': {
    src: '/images/hero-patmos.jpg',
    alt: { en: 'A small islet off Patmos seen from above', el: 'Νησάκι της Πάτμου από ψηλά' },
  },
};

const COPY: Record<
  AuthVariant,
  { eyebrow: [string, string]; headline: [string, string]; subline: [string, string] }
> = {
  login: {
    eyebrow: ['Sign in', 'Είσοδος'],
    headline: ['Welcome back.', 'Καλώς ήρθατε ξανά.'],
    subline: [
      'Manage your property, your partnership or your saved places.',
      'Διαχειριστείτε το κατάλυμα, τη συνεργασία ή τα αγαπημένα σας μέρη.',
    ],
  },
  signup: {
    eyebrow: ['Sign up', 'Εγγραφή'],
    headline: ['Join the guide.', 'Γίνετε μέλος του οδηγού.'],
    subline: [
      'Visitors save favourites; partners reach hotel guests across Greece.',
      'Οι επισκέπτες αποθηκεύουν αγαπημένα, οι συνεργάτες φτάνουν σε επισκέπτες ξενοδοχείων σε όλη την Ελλάδα.',
    ],
  },
  'no-access': {
    eyebrow: ['Account', 'Λογαριασμός'],
    headline: ['Almost there.', 'Σχεδόν έτοιμοι.'],
    subline: [
      'One more step and you are in.',
      'Ένα βήμα ακόμη και είστε μέσα.',
    ],
  },
};

export function AuthShell({
  locale,
  variant,
  title,
  subtitle,
  width = 'md',
  children,
  footer,
}: Props) {
  const en = locale === 'en';
  const t = (enText: string, elText: string) => (en ? enText : elText);
  const pick = (pair: [string, string]) => (en ? pair[0] : pair[1]);
  const prefix = en ? '/en' : '';
  const otherLocale = en ? 'el' : 'en';
  const photo = PHOTOS[variant];
  const copy = COPY[variant];

  const trust = [
    { icon: BadgeCheck, label: t('Verified businesses', 'Επαληθευμένες επιχειρήσεις') },
    { icon: MapPin, label: t('Hand-picked by locals', 'Επιλεγμένες από ντόπιους') },
    { icon: Map, label: t('All across Greece', 'Σε όλη την Ελλάδα') },
  ];

  return (
    <PageMotion>
      <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Photo panel — full column on desktop, a short band on mobile */}
        <aside className="relative h-48 overflow-hidden bg-sky-950 sm:h-56 lg:h-auto lg:min-h-dvh">
          <Image
            src={photo.src}
            alt={pick([photo.alt.en, photo.alt.el])}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="scale-105 object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-sky-950/75 via-sky-950/40 to-sky-950/85"
            aria-hidden
          />
          <AuthStagger className="relative z-10 flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-12">
            <AuthItem>
              <Link href={`/${locale}`} className="inline-block" aria-label="Roomriv">
                <img
                  src="/brand/roomriv-horizontal-white.svg"
                  alt="Roomriv"
                  className="h-9 w-auto lg:h-11"
                />
              </Link>
            </AuthItem>

            <div className="max-w-md">
              <AuthItem>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-sky-100/90 lg:mb-3">
                  {pick(copy.eyebrow)}
                </p>
              </AuthItem>
              <AuthItem>
                <p className="font-serif text-2xl font-semibold leading-tight sm:text-3xl lg:text-5xl">
                  {pick(copy.headline)}
                </p>
              </AuthItem>
              <AuthItem className="hidden lg:block">
                <p className="mt-4 text-base text-sky-50/90">{pick(copy.subline)}</p>
              </AuthItem>
            </div>

            <AuthItem className="hidden lg:block">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-sky-100/90">
                {trust.map(({ icon: Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 text-sky-300" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </AuthItem>
          </AuthStagger>
        </aside>

        {/* Form panel */}
        <div className="relative flex flex-col bg-gradient-to-b from-sky-50 via-background to-background">
          <div className="flex items-center justify-between px-4 pt-4 text-sm sm:px-8 lg:px-12 lg:pt-6">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t('Back to the guide', 'Επιστροφή στον οδηγό')}
            </Link>
            <a
              href={`/${otherLocale}${variant === 'no-access' ? '/no-access' : `/${variant}`}`}
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {en ? 'Ελληνικά' : 'English'}
            </a>
          </div>

          <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
            <div className={cn('w-full', width === 'lg' ? 'max-w-lg' : 'max-w-md')}>
              <AuthStagger>
                <AuthItem>
                  <h1 className="font-serif text-3xl font-semibold sm:text-4xl">{title}</h1>
                  {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
                </AuthItem>
                <AuthItem>
                  <div className="mt-6 rounded-2xl border border-sky-100 bg-card p-6 shadow-card-hover sm:p-8">
                    {children}
                  </div>
                </AuthItem>
                {footer && <AuthItem className="mt-5">{footer}</AuthItem>}
              </AuthStagger>
            </div>
          </main>

          <p className="px-4 pb-5 text-center text-xs text-muted-foreground sm:px-8 lg:px-12">
            Powered by{' '}
            <a
              href="https://www.itdev.gr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              ITDEV
            </a>
          </p>
        </div>
      </div>
    </PageMotion>
  );
}

/** Small helper so pages can build the same prefix as the shell. */
export function localePath(locale: string, path: string): string {
  return `${locale === 'en' ? '/en' : ''}${path}`;
}

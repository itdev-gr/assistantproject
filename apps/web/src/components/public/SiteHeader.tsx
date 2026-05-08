import { Link } from '@/i18n/routing';
import { Button } from '@aga/ui';

interface Props {
  locale: string;
}

export function SiteHeader({ locale }: Props) {
  const otherLocale = locale === 'en' ? 'el' : 'en';
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <span aria-hidden>🌊</span>
          {locale === 'en' ? 'Local Guide' : 'Τοπικός Οδηγός'}
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            {locale === 'en' ? 'Browse' : 'Περιήγηση'}
          </Link>
          <a
            href={`/${otherLocale}`}
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            {locale === 'en' ? 'Ελληνικά' : 'English'}
          </a>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">{locale === 'en' ? 'Sign in' : 'Είσοδος'}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

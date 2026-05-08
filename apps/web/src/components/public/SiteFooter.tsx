interface Props {
  locale: string;
}

export function SiteFooter({ locale }: Props) {
  return (
    <footer className="mt-auto border-t bg-background py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {locale === 'en' ? '© Local Guide — curated places.' : '© Τοπικός Οδηγός — επιλεγμένα μέρη.'}
        </p>
        <p>
          {locale === 'en'
            ? 'Looking for hotel partners?'
            : 'Είστε ξενοδοχείο και ψάχνετε συνεργασία;'}{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="/login">
            {locale === 'en' ? 'Sign in' : 'Σύνδεση'}
          </a>
        </p>
      </div>
    </footer>
  );
}

import { FLASH_ERROR_TEXT, type FlashErrorCode } from '@/lib/flash';

interface Props {
  locale: string;
  saved?: string | string[];
  error?: string | string[];
  /** Overrides the default success copy. */
  savedText?: string;
}

/** Renders the ?saved=1 / ?error=<code> flash from a page's searchParams. */
export function FlashBanner({ locale, saved, error, savedText }: Props) {
  const lang = locale === 'en' ? 'en' : 'el';
  const errorCode = Array.isArray(error) ? error[0] : error;

  if (errorCode) {
    const entry =
      FLASH_ERROR_TEXT[errorCode as FlashErrorCode] ?? FLASH_ERROR_TEXT.unknown;
    return (
      <div
        role="alert"
        className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[14px] font-medium text-destructive"
      >
        {entry[lang]}
      </div>
    );
  }

  if (saved) {
    return (
      <div
        role="status"
        className="mb-6 rounded-md border border-olive/40 bg-olive/10 px-4 py-3 text-[14px] font-medium text-olive"
      >
        {savedText ?? (lang === 'en' ? 'Changes saved.' : 'Οι αλλαγές αποθηκεύτηκαν.')}
      </div>
    );
  }

  return null;
}

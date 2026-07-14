'use client';

import { useRouter } from 'next/navigation';
import { Waves } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { DirectoryCategory } from '@/lib/public-directory';
import { useDirectorySearch, scrollToDirectory } from '@/lib/directory-search-store';

interface Props {
  locale: string;
  categories?: DirectoryCategory[];
}

export function SiteFooter({ locale, categories = [] }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const otherLocale = locale === 'en' ? 'el' : 'en';
  const router = useRouter();
  const setCategory = useDirectorySearch((s) => s.setCategory);

  function goToCategory(slug: string) {
    if (document.getElementById('directory')) {
      setCategory(slug);
      scrollToDirectory();
    } else {
      router.push(`/${locale}`);
    }
  }

  return (
    <footer className="mt-auto border-t bg-sky-950 text-sky-100">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-base font-semibold text-white">
              <Waves className="h-5 w-5" aria-hidden />
              {t('Local Guide', 'Τοπικός Οδηγός')}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-sky-200/80">
              {t(
                'Hand-picked restaurants, beaches, activities and trusted local services across the island.',
                'Επιλεγμένα εστιατόρια, παραλίες, δραστηριότητες και αξιόπιστες τοπικές υπηρεσίες σε όλο το νησί.',
              )}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              {t('Explore', 'Εξερεύνηση')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-sky-200/80 transition-colors duration-200 hover:text-white"
                >
                  {t('About us', 'Σχετικά με εμάς')}
                </Link>
              </li>
              {categories.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => goToCategory(c.slug)}
                    className="cursor-pointer text-sky-200/80 transition-colors duration-200 hover:text-white"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
              {categories.length === 0 && (
                <li>
                  <a
                    href={`/${locale}`}
                    className="text-sky-200/80 transition-colors duration-200 hover:text-white"
                  >
                    {t('Browse all places', 'Δείτε όλα τα μέρη')}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              {t('For business owners', 'Για επιχειρήσεις')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="/login"
                  className="text-sky-200/80 transition-colors duration-200 hover:text-white"
                >
                  {t('Sign in', 'Σύνδεση')}
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  className="text-sky-200/80 transition-colors duration-200 hover:text-white"
                >
                  {t('List your business', 'Καταχωρίστε την επιχείρησή σας')}
                </a>
              </li>
              <li>
                <a
                  href={`/${otherLocale}`}
                  className="text-sky-200/80 transition-colors duration-200 hover:text-white"
                >
                  {locale === 'en' ? 'Ελληνικά' : 'English'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-sky-800/60 pt-6 text-xs text-sky-300/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t(
              `© ${new Date().getFullYear()} Local Guide — curated places.`,
              `© ${new Date().getFullYear()} Τοπικός Οδηγός — επιλεγμένα μέρη.`,
            )}
          </p>
          <p>
            {t('Hero photo:', 'Φωτογραφία:')}{' '}
            <a
              href="https://unsplash.com/photos/mAOTatwrE_o"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 transition-colors duration-200 hover:text-white hover:underline"
            >
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

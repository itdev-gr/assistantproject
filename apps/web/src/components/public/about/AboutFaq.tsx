import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from './faq-data';

interface Props {
  locale: string;
}

export function AboutFaq({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="bg-background border-b" id="faq">
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <h2 className="text-center font-serif text-3xl font-semibold sm:text-4xl">
          {t('Questions, answered', 'Ερωτήσεις και απαντήσεις')}
        </h2>
        <div className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.qEn}
              className="bg-card group rounded-xl border px-5 py-4 shadow-sm transition-shadow duration-200 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {t(item.qEn, item.qEl)}
                <ChevronDown
                  className="text-muted-foreground h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {t(item.aEn, item.aEl)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

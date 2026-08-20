'use client';

import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { DirectoryBusiness } from '@/lib/public-directory';
import { useAssistant } from '@/lib/assistant-store';
import { CategoryGlyph } from './category-icons';
import { fadeUp, stagger } from './motion';

interface Props {
  locale: string;
  /** A real business shown inside the chat preview (first featured one). */
  example: DirectoryBusiness | null;
}

/** Dark band that puts the AI assistant — the platform's differentiator — front and center. */
export function AssistantPromo({ locale, example }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const { setOpen, openWith } = useAssistant();

  const questions = [
    t('Where for fresh fish tonight?', 'Πού για φρέσκο ψάρι απόψε;'),
    t('Beaches for families', 'Παραλίες για οικογένειες'),
    t('A romantic sunset spot', 'Ρομαντικό ηλιοβασίλεμα'),
  ];

  return (
    <section className="bg-sky-950">
      <motion.div
        className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-20"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <div>
          <motion.p
            variants={fadeUp}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {t('Local assistant', 'Τοπικός βοηθός')}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl"
          >
            {t(
              "Not sure what to pick? Ask a local.",
              'Δεν ξέρετε τι να διαλέξετε; Ρωτήστε έναν ντόπιο.',
            )}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-sky-100/85">
            {t(
              'The assistant knows every business in the directory and recommends based on what you ask — free, in your language, around the clock.',
              'Ο βοηθός γνωρίζει κάθε επιχείρηση του καταλόγου και προτείνει με βάση αυτό που ζητάτε — δωρεάν, στη γλώσσα σας, όλο το 24ωρο.',
            )}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-2.5">
            {questions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => openWith(q)}
                className="cursor-pointer rounded-full border border-sky-300/40 px-4 py-2 text-sm text-sky-100 transition-colors duration-200 hover:border-sky-300/80 hover:bg-sky-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                {q}
              </button>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} className="mt-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t('Start a conversation', 'Ξεκινήστε συζήτηση')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </motion.div>
        </div>

        {/* Chat preview */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col gap-3.5 rounded-2xl bg-background p-5 shadow-2xl shadow-black/40"
          aria-hidden
        >
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <MessageCircle className="h-4 w-4 text-accent-foreground" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">{t('Local assistant', 'Τοπικός βοηθός')}</p>
              <p className="text-xs text-emerald-600">● Online</p>
            </div>
          </div>
          <div className="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
            {t(
              "We're looking for a taverna by the sea tonight — party of four.",
              'Ψάχνουμε ταβέρνα για απόψε, κοντά στη θάλασσα — είμαστε 4 άτομα.',
            )}
          </div>
          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
            {example
              ? t(
                  `Great choice for tonight — ${example.name} is a local favourite. Take a look:`,
                  `Ωραία επιλογή για απόψε — το ${example.name} είναι από τα αγαπημένα των ντόπιων. Ρίξτε μια ματιά:`,
                )
              : t(
                  'Happy to help — here are a few places locals love.',
                  'Ευχαρίστως — ορίστε μερικά μέρη που αγαπούν οι ντόπιοι.',
                )}
          </div>
          {example && (
            <div className="flex w-[85%] items-center gap-3 self-start rounded-lg border p-2.5">
              <div className="h-14 w-[74px] shrink-0 overflow-hidden rounded-md">
                {example.images[0] ? (
                  <img
                    src={example.images[0]}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <CategoryGlyph slug={example.categorySlug} />
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold">{example.name}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {example.categoryName}
                  {example.priceBand != null && <> · {'€'.repeat(example.priceBand)}</>}
                </p>
                <p className="text-xs font-medium text-primary">
                  {t('View the page →', 'Δείτε τη σελίδα →')}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}

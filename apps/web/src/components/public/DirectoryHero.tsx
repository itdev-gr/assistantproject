interface Props {
  locale: string;
  totalCount: number;
}

export function DirectoryHero({ locale, totalCount }: Props) {
  return (
    <section className="border-b bg-gradient-to-br from-accent/40 via-background to-background">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          {locale === 'en'
            ? 'Discover places worth your time.'
            : 'Ανακαλύψτε μέρη που αξίζουν τον χρόνο σας.'}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {locale === 'en'
            ? 'A curated directory of restaurants, bars, activities and trusted local services. Browse all options or ask the assistant for a recommendation.'
            : 'Επιλεγμένος οδηγός εστιατορίων, μπαρ, δραστηριοτήτων και αξιόπιστων τοπικών υπηρεσιών. Δείτε όλες τις επιλογές ή ζητήστε πρόταση από τον assistant.'}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {locale === 'en'
            ? `${totalCount} verified businesses, hand-picked.`
            : `${totalCount} εγκεκριμένες επιχειρήσεις, επιλεγμένες με προσοχή.`}
        </p>
      </div>
    </section>
  );
}

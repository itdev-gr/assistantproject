'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeUp, Reveal } from '../motion';

interface Props {
  locale: string;
}

export function AboutStory({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <section className="bg-background border-b">
      <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <motion.h2 variants={fadeUp} className="font-serif text-3xl font-semibold sm:text-4xl">
            {t('Our story', 'Η ιστορία μας')}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg"
          >
            {t(
              'Local Guide started with a simple idea: visitors deserve honest recommendations, and the best local businesses deserve to be found. Menus change, owners change, seasons change — so instead of copying lists from the internet, we walk the harbours, eat at the tavernas and talk to the people behind the counter.',
              'Ο Τοπικός Οδηγός ξεκίνησε από μια απλή ιδέα: οι επισκέπτες αξίζουν ειλικρινείς προτάσεις και οι καλύτερες τοπικές επιχειρήσεις αξίζουν να βρίσκονται. Τα μενού αλλάζουν, οι ιδιοκτήτες αλλάζουν, οι εποχές αλλάζουν — γι αυτό, αντί να αντιγράφουμε λίστες από το διαδίκτυο, περπατάμε στα λιμάνια, τρώμε στις ταβέρνες και μιλάμε με τους ανθρώπους πίσω από τον πάγκο.',
            )}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-10 font-serif text-3xl font-semibold sm:text-4xl"
          >
            {t('Our mission', 'Η αποστολή μας')}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg"
          >
            {t(
              'Tourism should strengthen the place it happens in. Every recommendation here is hand-picked by people who live on the island, every visit supports a real local business, and every hotel that joins gives its guests something genuinely useful — not another ad space.',
              'Ο τουρισμός πρέπει να δυναμώνει τον τόπο όπου συμβαίνει. Κάθε πρόταση εδώ επιλέγεται από ανθρώπους που ζουν στο νησί, κάθε επίσκεψη στηρίζει μια πραγματική τοπική επιχείρηση και κάθε ξενοδοχείο που συμμετέχει προσφέρει στους επισκέπτες του κάτι πραγματικά χρήσιμο — όχι ακόμη έναν διαφημιστικό χώρο.',
            )}
          </motion.p>
        </div>
        <motion.div
          variants={fadeUp}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-lg md:aspect-[3/4]"
        >
          <Image
            src="/images/about-harbor.jpg"
            alt={t('Boats moored in a Rhodes harbour', 'Σκάφη αραγμένα σε λιμάνι της Ρόδου')}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </motion.div>
      </Reveal>
    </section>
  );
}

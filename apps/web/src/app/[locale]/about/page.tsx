import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/public/SiteHeader';
import { AboutContent } from '@/components/public/AboutContent';
import { SiteFooter } from '@/components/public/SiteFooter';
import { FloatingAssistant } from '@/components/public/FloatingAssistant';
import { PageMotion } from '@/components/public/motion';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'en'
    ? {
        title: 'About us — Local Guide',
        description:
          'Who we are and why we built Local Guide: honest, hand-picked recommendations connecting island visitors with trusted local businesses.',
      }
    : {
        title: 'Σχετικά με εμάς — Τοπικός Οδηγός',
        description:
          'Ποιοι είμαστε και γιατί φτιάξαμε τον Τοπικό Οδηγό: ειλικρινείς, επιλεγμένες προτάσεις που συνδέουν τους επισκέπτες του νησιού με αξιόπιστες τοπικές επιχειρήσεις.',
      };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageMotion>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader locale={locale} />
        <AboutContent locale={locale} />
        <SiteFooter locale={locale} />
        <FloatingAssistant
          locale={locale}
          hotelSlug={process.env.NEXT_PUBLIC_DEMO_HOTEL_SLUG ?? 'aegean-blue'}
        />
      </div>
    </PageMotion>
  );
}

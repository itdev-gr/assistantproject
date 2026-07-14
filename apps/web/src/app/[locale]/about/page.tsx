import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { PageMotion } from '@/components/public/motion';
import { AboutHero } from '@/components/public/about/AboutHero';
import { AboutStory } from '@/components/public/about/AboutStory';
import { ValuesGrid } from '@/components/public/about/ValuesGrid';
import { PhotoMosaic } from '@/components/public/about/PhotoMosaic';
import { HowItWorks } from '@/components/public/about/HowItWorks';
import { AboutFaq } from '@/components/public/about/AboutFaq';
import { AboutCta } from '@/components/public/about/AboutCta';

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
        <SiteHeader locale={locale} overlay />
        <main className="flex-1">
          <AboutHero locale={locale} />
          <AboutStory locale={locale} />
          <ValuesGrid locale={locale} />
          <PhotoMosaic locale={locale} />
          <HowItWorks locale={locale} />
          <AboutFaq locale={locale} />
          <AboutCta locale={locale} />
        </main>
        <SiteFooter locale={locale} />
      </div>
    </PageMotion>
  );
}

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { FloatingAssistant } from '@/components/public/FloatingAssistant';
import { PageMotion } from '@/components/public/motion';
import { AboutHero } from '@/components/public/about/AboutHero';
import { AboutStory } from '@/components/public/about/AboutStory';
import { ValuesGrid } from '@/components/public/about/ValuesGrid';
import { PhotoMosaic } from '@/components/public/about/PhotoMosaic';
import { HowItWorks } from '@/components/public/about/HowItWorks';
import { AboutFaq } from '@/components/public/about/AboutFaq';
import { AboutCta } from '@/components/public/about/AboutCta';
import { FAQ_ITEMS } from '@/components/public/about/faq-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://assistantproject-web.vercel.app';
const TITLE_EN = 'About us — Local Guide';
const TITLE_EL = 'Σχετικά με εμάς — Τοπικός Οδηγός';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const en = locale === 'en';
  const title = en ? TITLE_EN : TITLE_EL;
  const description = en
    ? 'Who we are and why we built Local Guide: honest, hand-picked recommendations connecting island visitors with trusted local businesses.'
    : 'Ποιοι είμαστε και γιατί φτιάξαμε τον Τοπικό Οδηγό: ειλικρινείς, επιλεγμένες προτάσεις που συνδέουν τους επισκέπτες του νησιού με αξιόπιστες τοπικές επιχειρήσεις.';

  return {
    title,
    description,
    alternates: {
      canonical: en ? '/en/about' : '/about',
      languages: { el: '/about', en: '/en/about', 'x-default': '/about' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Local Guide',
      locale: en ? 'en_US' : 'el_GR',
      title,
      description,
      images: ['/images/about-hero.jpg'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/images/about-hero.jpg'],
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const en = locale === 'en';
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: en ? TITLE_EN : TITLE_EL,
    url: en ? `${SITE_URL}/en/about` : `${SITE_URL}/about`,
    mainEntity: {
      '@type': 'Organization',
      name: 'Local Guide',
      url: SITE_URL,
      areaServed: 'Rhodes, Greece',
    },
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: en ? item.qEn : item.qEl,
      acceptedAnswer: { '@type': 'Answer', text: en ? item.aEn : item.aEl },
    })),
  };
  const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <PageMotion>
      <div className="bg-background flex min-h-dvh flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(aboutJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }}
        />
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
        <FloatingAssistant
          locale={locale}
          hotelSlug={process.env.NEXT_PUBLIC_DEMO_HOTEL_SLUG ?? 'aegean-blue'}
        />
      </div>
    </PageMotion>
  );
}

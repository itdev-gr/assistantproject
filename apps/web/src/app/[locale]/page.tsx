import { setRequestLocale } from 'next-intl/server';
import { listDirectory } from '@/lib/public-directory';
import { SiteHeader } from '@/components/public/SiteHeader';
import { HomeHero } from '@/components/public/HomeHero';
import { FeaturedStrip } from '@/components/public/FeaturedStrip';
import { AboutSection } from '@/components/public/AboutSection';
import { DirectoryBrowser } from '@/components/public/DirectoryBrowser';
import { SiteFooter } from '@/components/public/SiteFooter';
import { FloatingAssistant } from '@/components/public/FloatingAssistant';
import { PageMotion } from '@/components/public/motion';

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businesses, categories } = await listDirectory(locale === 'en' ? 'en' : 'el');

  const featured = businesses.filter(
    (b) => b.topTier === 'exclusive' || b.topTier === 'featured',
  );

  return (
    <PageMotion>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader locale={locale} overlay />
        <HomeHero locale={locale} totalCount={businesses.length} categories={categories} />
        {featured.length > 0 && <FeaturedStrip locale={locale} businesses={featured} />}
        <AboutSection locale={locale} />
        <DirectoryBrowser locale={locale} businesses={businesses} categories={categories} />
        <SiteFooter locale={locale} categories={categories} />
        <FloatingAssistant
          locale={locale}
          hotelSlug={process.env.NEXT_PUBLIC_DEMO_HOTEL_SLUG ?? 'aegean-blue'}
        />
      </div>
    </PageMotion>
  );
}

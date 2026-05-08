import { setRequestLocale } from 'next-intl/server';
import { listDirectory } from '@/lib/public-directory';
import { SiteHeader } from '@/components/public/SiteHeader';
import { DirectoryHero } from '@/components/public/DirectoryHero';
import { DirectoryBrowser } from '@/components/public/DirectoryBrowser';
import { SiteFooter } from '@/components/public/SiteFooter';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { businesses, categories } = await listDirectory(locale === 'en' ? 'en' : 'el');

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader locale={locale} />
      <DirectoryHero locale={locale} totalCount={businesses.length} />
      <DirectoryBrowser locale={locale} businesses={businesses} categories={categories} />
      <SiteFooter locale={locale} />
    </div>
  );
}

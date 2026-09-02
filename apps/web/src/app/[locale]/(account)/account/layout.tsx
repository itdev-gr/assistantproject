import { setRequestLocale } from 'next-intl/server';
import { requireUser } from '@/lib/auth-context';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { AccountNav } from '@/components/account/AccountNav';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AccountLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader locale={locale} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
          <AccountNav locale={locale} />
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

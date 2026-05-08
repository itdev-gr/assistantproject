import { setRequestLocale } from 'next-intl/server';
import { OwnerSidebar } from '@/components/owner/OwnerSidebar';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // TODO(week-3): require auth via Supabase. Redirect to /login if no session.
  return (
    <div className="flex min-h-dvh">
      <OwnerSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

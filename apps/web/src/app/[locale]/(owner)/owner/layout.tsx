import { setRequestLocale } from 'next-intl/server';
import { OwnerSidebar } from '@/components/owner/OwnerSidebar';
import { getAuthContext } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Access is enforced by the middleware and per-page requireOwner();
  // the context here is display-only (sidebar footer email).
  const ctx = await getAuthContext();
  let pendingConnections = 0;
  if (ctx?.hotelId) {
    const supabase = await getServerClient();
    const { count } = await supabase
      .from('partnership_requests')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', ctx.hotelId)
      .eq('status', 'pending')
      .eq('initiated_by', 'business');
    pendingConnections = count ?? 0;
  }
  return (
    <div className="dash flex min-h-dvh flex-col bg-background text-foreground lg:flex-row">
      <OwnerSidebar email={ctx?.email} pendingConnections={pendingConnections} />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}

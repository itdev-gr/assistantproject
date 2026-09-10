import { setRequestLocale } from 'next-intl/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getAuthContext } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Access is enforced by the middleware and per-page requireSuperAdmin();
  // the context here is display-only (sidebar footer email).
  const ctx = await getAuthContext();
  let pendingConnections = 0;
  if (ctx?.role === 'super_admin') {
    const supabase = await getServerClient();
    const { count } = await supabase
      .from('partnership_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingConnections = count ?? 0;
  }
  return (
    <div className="dash flex min-h-dvh flex-col bg-background text-foreground lg:flex-row">
      <AdminSidebar email={ctx?.email} pendingConnections={pendingConnections} />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}

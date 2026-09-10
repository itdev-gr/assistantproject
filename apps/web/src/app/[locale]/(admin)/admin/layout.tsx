import { setRequestLocale } from 'next-intl/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getAuthContext } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { createSupabaseServiceClient } from '@aga/db/service';

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
  let billingIssues = 0;
  if (ctx?.role === 'super_admin') {
    const supabase = await getServerClient();
    const [{ count }, { data: latestRun }] = await Promise.all([
      supabase.from('partnership_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      // Service role: the audit table has no client policies.
      createSupabaseServiceClient()
        .from('billing_reconciliation_runs')
        .select('issue_count')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    pendingConnections = count ?? 0;
    billingIssues = latestRun?.issue_count ?? 0;
  }
  return (
    <div className="dash flex min-h-dvh flex-col bg-background text-foreground lg:flex-row">
      <AdminSidebar email={ctx?.email} pendingConnections={pendingConnections} billingIssues={billingIssues} />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}

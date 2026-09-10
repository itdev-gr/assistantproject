import { setRequestLocale } from 'next-intl/server';
import { PartnerSidebar } from '@/components/partner/PartnerSidebar';
import { getAuthContext } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Approved partners get the sidebar shell; pending/rejected applicants see
 * the bare /partner/pending page. Access itself is enforced by the middleware
 * and per-page requirePartner().
 */
export default async function PartnerLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getAuthContext();
  let approved = ctx?.role === 'super_admin';
  if (ctx && ctx.role === 'partner') {
    const supabase = await getServerClient();
    const { data } = await supabase
      .from('profiles')
      .select('partner_status')
      .eq('id', ctx.userId)
      .maybeSingle();
    approved = data?.partner_status === 'approved';
  }
  if (!approved) return <>{children}</>;
  let pendingConnections = 0;
  if (ctx) {
    const supabase = await getServerClient();
    const { data: owned } = await supabase
      .from('business_owners')
      .select('business_id')
      .eq('auth_user_id', ctx.userId);
    const ids = (owned ?? []).map((o) => o.business_id);
    if (ids.length > 0) {
      const { count } = await supabase
        .from('partnership_requests')
        .select('id', { count: 'exact', head: true })
        .in('business_id', ids)
        .eq('status', 'pending')
        .eq('initiated_by', 'hotel');
      pendingConnections = count ?? 0;
    }
  }
  return (
    <div className="dash flex min-h-dvh flex-col bg-background text-foreground lg:flex-row">
      <PartnerSidebar email={ctx?.email} pendingConnections={pendingConnections} />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}

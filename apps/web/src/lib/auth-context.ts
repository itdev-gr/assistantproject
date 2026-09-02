import { redirect } from 'next/navigation';
import { getServerClient } from './supabase-server';
import { homeForRole, type AgaRole } from './roles';

export type { AgaRole } from './roles';

export interface AuthContext {
  userId: string;
  email: string;
  role: AgaRole;
  hotelId: string | null;
}

interface JwtClaims {
  aga_role?: AgaRole;
  hotel_id?: string;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const claims = data.claims as JwtClaims & { sub: string; email: string };
  if (!claims.aga_role) return null;
  return {
    userId: claims.sub,
    email: claims.email,
    role: claims.aga_role,
    hotelId: claims.hotel_id ?? null,
  };
}

export async function requireOwner(): Promise<AuthContext & { hotelId: string }> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login?next=/owner');
  if (ctx.role === 'super_admin') {
    // Super-admins shouldn't operate on the owner surface — bounce them.
    redirect('/admin');
  }
  if (ctx.role === 'user' || ctx.role === 'partner') redirect(homeForRole(ctx.role));
  if (!ctx.hotelId) redirect('/login?error=no_hotel');
  return ctx as AuthContext & { hotelId: string };
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login?next=/admin');
  if (ctx.role !== 'super_admin') redirect('/');
  return ctx;
}

/** Any signed-in account (user, partner, hotel staff or super admin). */
export async function requireUser(next = '/account'): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(next)}`);
  return ctx;
}

export type PartnerStatus = 'pending' | 'approved' | 'rejected';

export interface PartnerContext extends AuthContext {
  partnerStatus: PartnerStatus | null;
  /** Businesses this account may edit (via `business_owners`). */
  businessIds: string[];
}

/**
 * Approved partner (or a super admin peeking at the partner surface).
 * Pending / rejected applicants are sent to /partner/pending, which must NOT
 * call this helper.
 */
export async function requirePartner(): Promise<PartnerContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login?next=/partner');
  if (ctx.role !== 'partner' && ctx.role !== 'super_admin') redirect(homeForRole(ctx.role));
  const supabase = await getServerClient();
  const [{ data: profile }, { data: owned }] = await Promise.all([
    supabase.from('profiles').select('partner_status').eq('id', ctx.userId).maybeSingle(),
    supabase.from('business_owners').select('business_id').eq('auth_user_id', ctx.userId),
  ]);
  const partnerStatus = (profile?.partner_status ?? null) as PartnerStatus | null;
  if (ctx.role === 'partner' && partnerStatus !== 'approved') redirect('/partner/pending');
  return {
    ...ctx,
    partnerStatus,
    businessIds: (owned ?? []).map((o) => o.business_id),
  };
}

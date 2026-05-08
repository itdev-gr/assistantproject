import { redirect } from 'next/navigation';
import { getServerClient } from './supabase-server';

export type AgaRole = 'super_admin' | 'owner' | 'manager' | 'staff';

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
  if (!ctx.hotelId) redirect('/login?error=no_hotel');
  return ctx as AuthContext & { hotelId: string };
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login?next=/admin');
  if (ctx.role !== 'super_admin') redirect('/');
  return ctx;
}

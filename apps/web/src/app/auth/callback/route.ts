import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { homeForRole, type AgaRole } from '@/lib/roles';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  let next = requestedNext;
  if (!next) {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims as { aga_role?: AgaRole } | undefined;
    next = homeForRole(claims?.aga_role ?? null);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing.js';

const intl = createIntlMiddleware(routing);

const PROTECTED = [
  { prefix: '/owner', roles: ['owner', 'manager', 'staff', 'super_admin'] },
  { prefix: '/admin', roles: ['super_admin'] },
] as const;

function stripLocale(pathname: string): string {
  for (const l of routing.locales) {
    if (pathname === `/${l}`) return '/';
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
  }
  return pathname;
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/auth/')) return NextResponse.next();

  let res = intl(req);
  if (!(res instanceof NextResponse)) res = NextResponse.next();

  const path = stripLocale(req.nextUrl.pathname);
  const guard = PROTECTED.find((g) => path === g.prefix || path.startsWith(`${g.prefix}/`));
  if (!guard) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          for (const c of toSet) res.cookies.set(c.name, c.value, c.options);
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as { aga_role?: string } | null;
  if (error || !claims?.aga_role) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }
  if (!(guard.roles as readonly string[]).includes(claims.aga_role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\.[^/]+$).*)'],
};

import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing.js';

const intl = createIntlMiddleware(routing);

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Pass-through for API routes — no locale prefix needed
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  return intl(req);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\.[^/]+$).*)'],
};

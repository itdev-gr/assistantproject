import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from './database.types.js';

export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options: CookieOptions }[]): void;
}

export function createSupabaseServerClient(cookies: CookieAdapter) {
  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => cookies.getAll(),
        setAll: (toSet) => cookies.setAll(toSet),
      },
    },
  );
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

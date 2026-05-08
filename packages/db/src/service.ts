import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

/**
 * Service-role client. Bypasses RLS — only use server-side in trusted Edge
 * Functions or API routes that have already authenticated the caller.
 */
export function createSupabaseServiceClient() {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

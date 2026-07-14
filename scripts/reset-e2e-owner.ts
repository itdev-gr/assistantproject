/**
 * One-time (or as-needed) reset of the e2e demo owner's password in the
 * linked remote Supabase project. Uses the Admin API with the service-role
 * key — never expose that key client-side, and never print it or the
 * resulting password to stdout/stderr.
 *
 * Finds the user by email (auth.admin.listUsers + filter, since
 * getUserByEmail isn't available on the installed supabase-js version) and
 * sets its password via auth.admin.updateUserById.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) — project URL
 *   SUPABASE_SERVICE_ROLE_KEY                  — service-role key
 *   AGA_E2E_OWNER_EMAIL                        — demo owner's email
 *   AGA_E2E_OWNER_PASSWORD                     — new password to set
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   AGA_E2E_OWNER_EMAIL=... AGA_E2E_OWNER_PASSWORD=... \
 *     pnpm exec tsx scripts/reset-e2e-owner.ts
 *   # or, on Node >=22.6 with TS type-stripping support:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   AGA_E2E_OWNER_EMAIL=... AGA_E2E_OWNER_PASSWORD=... \
 *     node scripts/reset-e2e-owner.ts
 *
 * See README §Tests for the "E2E credentials" note.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
}

function requireEnvAny(keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`Missing env var: one of ${keys.join(' / ')}`);
}

async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | undefined> {
  const perPage = 200;
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers failed: ${error.message}`);
    }

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) {
      return match.id;
    }

    if (data.users.length < perPage) {
      return undefined; // exhausted all pages, no match
    }
    page += 1;
  }
}

async function main() {
  const supabaseUrl = requireEnvAny(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const email = requireEnv('AGA_E2E_OWNER_EMAIL');
  const password = requireEnv('AGA_E2E_OWNER_PASSWORD');

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await findUserIdByEmail(admin, email);
  if (!userId) {
    throw new Error(`No user found with email ${email}`);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
  });
  if (updateError) {
    throw new Error(`updateUserById failed: ${updateError.message}`);
  }

  console.log(`Password reset for ${email} (user id ${userId}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

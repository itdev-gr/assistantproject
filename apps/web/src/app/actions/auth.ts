'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { changePasswordSchema, profileUpdateSchema, signUpSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { getServerClient } from '@/lib/supabase-server';
import { getAuthContext } from '@/lib/auth-context';
import { homeForRole, type AgaRole } from '@/lib/roles';
import { checkAndRecordRateLimit, hashRateKey } from '@/lib/rate-limit';

const sendSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

export async function sendMagicLink(
  input: z.input<typeof sendSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid email' };

  const supabase = await getServerClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectTo = new URL('/auth/callback', origin);
  if (parsed.data.next) redirectTo.searchParams.set('next', parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: redirectTo.toString(),
      shouldCreateUser: false,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function signInWithPassword(
  input: z.input<typeof passwordSchema>,
): Promise<{ ok: true; home: string } | { ok: false; error: string }> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid credentials' };
  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/', 'layout');
  const role = (data.session?.access_token ? await roleFromClient(supabase) : null) ?? null;
  return { ok: true, home: homeForRole(role) };
}

async function roleFromClient(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
): Promise<AgaRole | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { aga_role?: AgaRole } | undefined;
  return claims?.aga_role ?? null;
}

export type SignUpResult =
  | { ok: true; needsConfirmation: boolean; home: string }
  | { ok: false; error: string; fields?: Record<string, string> };

/**
 * Self-serve signup for visitors ("user") and business owners ("partner").
 * Role + application details travel as auth metadata; the `handle_new_user`
 * trigger turns them into `profiles` / `partner_applications` rows.
 */
export async function signUpWithPassword(raw: unknown): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return { ok: false, error: 'invalid_input', fields };
  }
  const input = parsed.data;

  const secret = process.env.SESSION_HMAC_SECRET;
  if (secret) {
    const h = await headers();
    const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
    const { limited } = await checkAndRecordRateLimit(createSupabaseServiceClient(), {
      ip: hashRateKey('ip', `signup:${ip}`, secret),
    });
    if (limited) return { ok: false, error: 'rate_limited' };
  }

  const home = homeForRole(input.role);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectTo = new URL('/auth/callback', origin);
  redirectTo.searchParams.set('next', home);

  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: redirectTo.toString(),
      data: {
        role: input.role,
        display_name: input.displayName ?? '',
        locale: input.locale,
        business_name: input.businessName ?? '',
        business_category_id: input.businessCategoryId ?? '',
        business_phone: input.businessPhone ?? '',
        business_address: input.businessAddress ?? '',
        business_description: input.businessDescription ?? '',
      },
    },
  });
  if (error) return { ok: false, error: error.message };
  // With confirmations on, Supabase answers an already-registered email with a
  // stub user that has no identities instead of an error.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: 'already_registered' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, needsConfirmation: !data.session, home };
}

export async function updateProfile(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: 'unauthenticated' };
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.displayName,
      avatar_url: parsed.data.avatarUrl,
      locale: parsed.data.locale,
    })
    .eq('id', ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/(account)/account', 'layout');
  return { ok: true };
}

export async function changePassword(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: 'unauthenticated' };
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const supabase = await getServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

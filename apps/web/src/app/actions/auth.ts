'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase-server';

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
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid credentials' };
  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function signUpWithPassword(
  input: z.input<typeof passwordSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid email or password (min 6 chars)' };
  const supabase = await getServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: undefined },
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function signOut() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

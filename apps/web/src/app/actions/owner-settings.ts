'use server';

import { z } from 'zod';
import { getServerClient } from '@/lib/supabase-server';
import { getAuthContext } from '@/lib/auth-context';

const passwordSchema = z.object({
  password: z.string().min(6).max(72),
});

export async function changePassword(input: z.input<typeof passwordSchema>) {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false as const, error: 'unauthenticated' };
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const supabase = await getServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

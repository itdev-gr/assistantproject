'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';

const idSchema = z.object({ businessId: z.string().uuid() });

/**
 * Generate (or rotate) the per-business webhook secret. Returns the cleartext
 * secret ONCE so the admin can copy it; subsequent reads return null.
 */
export async function regenerateWebhookSecret(input: z.input<typeof idSchema>) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();

  const secret = randomBytes(32).toString('hex');
  const { error } = await admin
    .from('businesses')
    .update({ webhook_secret: secret })
    .eq('id', parsed.data.businessId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/[locale]/(admin)/admin/businesses', 'layout');
  return { ok: true as const, secret };
}

export async function clearWebhookSecret(input: z.input<typeof idSchema>) {
  await requireSuperAdmin();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid' };
  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from('businesses')
    .update({ webhook_secret: null })
    .eq('id', parsed.data.businessId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/[locale]/(admin)/admin/businesses', 'layout');
  return { ok: true as const };
}

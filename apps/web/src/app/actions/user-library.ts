'use server';

import { revalidatePath } from 'next/cache';
import { businessIdSchema } from '@aga/api-contracts';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Visitor library: favourites, "I've been here", recently viewed.
 * Everything runs through the cookie-bound client so RLS scopes rows to the
 * caller; no service key involved.
 */

type Fail = { ok: false; error: 'unauthenticated' | 'invalid' | string };

async function viewer() {
  const supabase = await getServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims as { sub?: string } | undefined)?.sub ?? null;
  return { supabase, userId };
}

function revalidateAccount() {
  revalidatePath('/[locale]/(account)/account', 'layout');
}

export async function getLibraryState(
  raw: unknown,
): Promise<{ ok: true; favorited: boolean; visited: boolean } | Fail> {
  const parsed = businessIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { supabase, userId } = await viewer();
  if (!userId) return { ok: false, error: 'unauthenticated' };
  const id = parsed.data.businessId;
  const [fav, vis] = await Promise.all([
    supabase
      .from('user_favorites')
      .select('business_id')
      .eq('user_id', userId)
      .eq('business_id', id)
      .maybeSingle(),
    supabase
      .from('user_visits')
      .select('business_id')
      .eq('user_id', userId)
      .eq('business_id', id)
      .maybeSingle(),
  ]);
  return { ok: true, favorited: !!fav.data, visited: !!vis.data };
}

export async function listFavoriteIds(): Promise<{ ok: true; ids: string[] } | Fail> {
  const { supabase, userId } = await viewer();
  if (!userId) return { ok: false, error: 'unauthenticated' };
  const { data, error } = await supabase
    .from('user_favorites')
    .select('business_id')
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, ids: (data ?? []).map((r) => r.business_id) };
}

export async function toggleFavorite(
  raw: unknown,
): Promise<{ ok: true; favorited: boolean } | Fail> {
  const parsed = businessIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { supabase, userId } = await viewer();
  if (!userId) return { ok: false, error: 'unauthenticated' };
  const id = parsed.data.businessId;
  const { data: existing } = await supabase
    .from('user_favorites')
    .select('business_id')
    .eq('user_id', userId)
    .eq('business_id', id)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', id);
    if (error) return { ok: false, error: error.message };
    revalidateAccount();
    return { ok: true, favorited: false };
  }
  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: userId, business_id: id });
  if (error) return { ok: false, error: error.message };
  revalidateAccount();
  return { ok: true, favorited: true };
}

export async function toggleVisited(raw: unknown): Promise<{ ok: true; visited: boolean } | Fail> {
  const parsed = businessIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { supabase, userId } = await viewer();
  if (!userId) return { ok: false, error: 'unauthenticated' };
  const id = parsed.data.businessId;
  const { data: existing } = await supabase
    .from('user_visits')
    .select('business_id')
    .eq('user_id', userId)
    .eq('business_id', id)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from('user_visits')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', id);
    if (error) return { ok: false, error: error.message };
    revalidateAccount();
    return { ok: true, visited: false };
  }
  const { error } = await supabase
    .from('user_visits')
    .insert({ user_id: userId, business_id: id, source: 'manual' });
  if (error) return { ok: false, error: error.message };
  revalidateAccount();
  return { ok: true, visited: true };
}

export async function recordRecentView(raw: unknown): Promise<{ ok: true } | Fail> {
  const parsed = businessIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { supabase, userId } = await viewer();
  if (!userId) return { ok: false, error: 'unauthenticated' };
  const { error } = await supabase.rpc('record_recent_view', {
    p_business_id: parsed.data.businessId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeRecentView(raw: unknown): Promise<{ ok: true } | Fail> {
  const parsed = businessIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { supabase, userId } = await viewer();
  if (!userId) return { ok: false, error: 'unauthenticated' };
  const { error } = await supabase
    .from('user_recent_views')
    .delete()
    .eq('user_id', userId)
    .eq('business_id', parsed.data.businessId);
  if (error) return { ok: false, error: error.message };
  revalidateAccount();
  return { ok: true };
}

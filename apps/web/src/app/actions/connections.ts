'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import {
  createBusinessConnectionRequestSchema,
  createHotelConnectionRequestSchema,
  decideConnectionRequestSchema,
  connectionRequestIdSchema,
  partnershipIdSchema,
} from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireOwner, requirePartner, requireUser } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { reindexHotelKnowledge } from '@/lib/knowledge-indexer';
import { requestErrorCode, type ConnectionErrorCode } from '@/lib/connections';

/**
 * Hotel ⇄ business connection requests.
 *
 * Every write goes through the security-definer RPCs from migration 0015 via
 * the cookie-bound client, so `auth.uid()` is the real actor and the database
 * decides who may send, accept, decline or cancel. These actions only
 * validate input, translate error codes and refresh the affected pages.
 */

type Result<T = Record<never, never>> = ({ ok: true } & T) | { ok: false; error: ConnectionErrorCode };

function revalidate() {
  revalidatePath('/[locale]/(owner)/owner/partners', 'layout');
  revalidatePath('/[locale]/(owner)/owner', 'layout');
  revalidatePath('/[locale]/(partner)/partner', 'layout');
  revalidatePath('/[locale]/(admin)/admin', 'layout');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/p/[id]', 'page');
  revalidatePath('/[locale]/(guest)/h/[hotelSlug]', 'page');
}

/** Re-embed the hotel's knowledge in the background; never fails the request. */
function scheduleReindex(hotelId: string) {
  after(async () => {
    try {
      await reindexHotelKnowledge(createSupabaseServiceClient(), hotelId);
    } catch (err) {
      console.error('knowledge reindex after connection change failed:', err);
    }
  });
}

export async function createHotelRequest(raw: unknown): Promise<Result<{ requestId: string; unclaimed: boolean }>> {
  const ctx = await requireOwner();
  const parsed = createHotelConnectionRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const input = parsed.data;

  const supabase = await getServerClient();
  const { data, error } = await supabase.rpc('create_partnership_request', {
    p_hotel_id: ctx.hotelId,
    p_business_id: input.businessId,
    p_initiated_by: 'hotel',
    p_message: input.message,
    p_commission: input.proposedCommissionPct ?? undefined,
    p_offer: input.guestOffer ?? undefined,
  });
  if (error) return { ok: false, error: requestErrorCode(error.message) };

  // Tell the hotel when the business has no account yet: our team answers then.
  const admin = createSupabaseServiceClient();
  const { count } = await admin
    .from('business_owners')
    .select('business_id', { count: 'exact', head: true })
    .eq('business_id', input.businessId);

  revalidate();
  return { ok: true, requestId: data as string, unclaimed: (count ?? 0) === 0 };
}

export async function createBusinessRequest(raw: unknown): Promise<Result<{ requestId: string }>> {
  const ctx = await requirePartner();
  const parsed = createBusinessConnectionRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const input = parsed.data;
  // No super-admin exemption: a request is always sent as a real business owner.
  if (!ctx.businessIds.includes(input.businessId)) return { ok: false, error: 'forbidden' };

  const supabase = await getServerClient();
  const { data, error } = await supabase.rpc('create_partnership_request', {
    p_hotel_id: input.hotelId,
    p_business_id: input.businessId,
    p_initiated_by: 'business',
    p_message: input.message,
    p_commission: input.proposedCommissionPct ?? undefined,
    p_offer: input.guestOffer ?? undefined,
  });
  if (error) return { ok: false, error: requestErrorCode(error.message) };

  revalidate();
  return { ok: true, requestId: data as string };
}

/** Accept or decline. The RPC checks the caller is the counterparty or a super admin. */
export async function decideRequest(raw: unknown): Promise<Result<{ partnershipId: string | null }>> {
  await requireUser();
  const parsed = decideConnectionRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const input = parsed.data;

  const supabase = await getServerClient();
  if (input.accept) {
    const { data: request } = await supabase
      .from('partnership_requests')
      .select('hotel_id')
      .eq('id', input.requestId)
      .maybeSingle();
    const { data, error } = await supabase.rpc('accept_partnership_request', { p_id: input.requestId });
    if (error) return { ok: false, error: requestErrorCode(error.message) };
    if (request?.hotel_id) scheduleReindex(request.hotel_id);
    revalidate();
    return { ok: true, partnershipId: (data as string | null) ?? null };
  }

  const { error } = await supabase.rpc('decline_partnership_request', {
    p_id: input.requestId,
    p_reason: input.declineReason ?? undefined,
  });
  if (error) return { ok: false, error: requestErrorCode(error.message) };
  revalidate();
  return { ok: true, partnershipId: null };
}

export async function cancelRequest(raw: unknown): Promise<Result> {
  await requireUser();
  const parsed = connectionRequestIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const supabase = await getServerClient();
  const { error } = await supabase.rpc('cancel_partnership_request', { p_id: parsed.data.requestId });
  if (error) return { ok: false, error: requestErrorCode(error.message) };
  revalidate();
  return { ok: true };
}

/** Hotel owner or super admin ends a connection (partnership stays as history). */
export async function disconnectPartnership(raw: unknown): Promise<Result> {
  await requireUser();
  const parsed = partnershipIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const supabase = await getServerClient();
  const { data: partnership } = await supabase
    .from('partnerships')
    .select('hotel_id')
    .eq('id', parsed.data.partnershipId)
    .maybeSingle();
  const { error } = await supabase.rpc('disconnect_partnership', { p_partnership_id: parsed.data.partnershipId });
  if (error) return { ok: false, error: requestErrorCode(error.message) };
  if (partnership?.hotel_id) scheduleReindex(partnership.hotel_id);
  revalidate();
  return { ok: true };
}

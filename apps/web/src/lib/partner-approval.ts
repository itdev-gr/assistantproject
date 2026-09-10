import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import { geocodeAddress } from './geocode';
import { NEEDS_GEOCODE_TAG } from './listing-request';

type DB = SupabaseClient<Database>;

/**
 * One approval path for a business listing, whether it came from a partner
 * signup (migration 0016 creates the listing immediately), the anonymous
 * "list your business" form, or an admin-created row.
 *
 * Approving verifies the listing, fixes a placeholder pin when the address
 * geocodes, and — when a pending partner application is linked to it —
 * approves that application and unlocks the partner account. Rejecting
 * deactivates the listing and rejects the linked application.
 */
export async function approveBusinessListing(
  admin: DB,
  businessId: string,
  reviewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: business } = await admin
    .from('businesses')
    .select('id, address, tags, lat, lng')
    .eq('id', businessId)
    .maybeSingle();
  if (!business) return { ok: false, error: 'business_not_found' };

  const update: Database['public']['Tables']['businesses']['Update'] = { verified: true };
  const tags = business.tags ?? [];
  if (tags.includes(NEEDS_GEOCODE_TAG) && business.address) {
    const geo = await geocodeAddress(`${business.address}, Greece`);
    if (geo) {
      update.lat = geo.lat;
      update.lng = geo.lng;
      update.tags = tags.filter((t) => t !== NEEDS_GEOCODE_TAG);
    }
  }
  const { error } = await admin.from('businesses').update(update).eq('id', businessId);
  if (error) return { ok: false, error: error.message };

  return syncPartnerApplication(admin, businessId, reviewerId, 'approved', null);
}

export async function rejectBusinessListing(
  admin: DB,
  businessId: string,
  reviewerId: string,
  reason: string | null = null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin.from('businesses').update({ active: false }).eq('id', businessId);
  if (error) return { ok: false, error: error.message };
  return syncPartnerApplication(admin, businessId, reviewerId, 'rejected', reason);
}

/** Mirror a listing decision onto the pending partner application (if any) and its profile. */
export async function syncPartnerApplication(
  admin: DB,
  businessId: string,
  reviewerId: string,
  status: 'approved' | 'rejected',
  reason: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: apps } = await admin
    .from('partner_applications')
    .select('id, user_id')
    .eq('business_id', businessId)
    .eq('status', 'pending');
  for (const app of apps ?? []) {
    const { error: appErr } = await admin
      .from('partner_applications')
      .update({
        status,
        rejection_reason: status === 'rejected' ? reason : null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', app.id);
    if (appErr) return { ok: false, error: appErr.message };
    const { error: profErr } = await admin
      .from('profiles')
      .update({ partner_status: status })
      .eq('id', app.user_id);
    if (profErr) return { ok: false, error: profErr.message };
    if (status === 'approved') {
      await admin
        .from('business_owners')
        .upsert(
          { auth_user_id: app.user_id, business_id: businessId },
          { onConflict: 'auth_user_id,business_id', ignoreDuplicates: true },
        );
    }
  }
  return { ok: true };
}

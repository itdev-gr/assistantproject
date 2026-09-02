'use server';

import { revalidatePath } from 'next/cache';
import { partnerDecisionSchema } from '@aga/api-contracts';
import { createSupabaseServiceClient } from '@aga/db/service';
import type { Json } from '@aga/db/types';
import { requireSuperAdmin } from '@/lib/auth-context';
import { geocodeAddress, GREECE_CENTROID } from '@/lib/geocode';
import { NEEDS_GEOCODE_TAG } from '@/lib/listing-request';
import { PARTNER_OWNED_TAG } from '@/lib/partners';

type Result = { ok: true; businessId: string | null } | { ok: false; error: string };

function revalidate() {
  revalidatePath('/[locale]/(admin)/admin/partners', 'layout');
  revalidatePath('/[locale]/(partner)/partner', 'layout');
  revalidatePath('/[locale]', 'page');
}

/**
 * Approve or reject a partner application. Approval links the applicant to an
 * existing listing or creates a verified one from the application details.
 */
export async function decidePartnerApplication(raw: unknown): Promise<Result> {
  const ctx = await requireSuperAdmin();
  const parsed = partnerDecisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { applicationId, approve, existingBusinessId, rejectionReason } = parsed.data;
  const admin = createSupabaseServiceClient();

  const { data: app } = await admin
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();
  if (!app) return { ok: false, error: 'not_found' };
  if (app.status !== 'pending') return { ok: false, error: 'already_decided' };

  const reviewed = { reviewed_by: ctx.userId, reviewed_at: new Date().toISOString() };

  if (!approve) {
    const { error } = await admin
      .from('partner_applications')
      .update({ status: 'rejected', rejection_reason: rejectionReason || null, ...reviewed })
      .eq('id', applicationId);
    if (error) return { ok: false, error: error.message };
    await admin.from('profiles').update({ partner_status: 'rejected' }).eq('id', app.user_id);
    revalidate();
    return { ok: true, businessId: null };
  }

  let businessId = existingBusinessId ?? null;
  if (businessId) {
    const { data: existing } = await admin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .maybeSingle();
    if (!existing) return { ok: false, error: 'business_not_found' };
  } else {
    let categoryId = app.category_id;
    if (!categoryId) {
      const { data: cat } = await admin
        .from('business_categories')
        .select('id')
        .order('slug')
        .limit(1)
        .maybeSingle();
      if (!cat) return { ok: false, error: 'no_categories' };
      categoryId = cat.id;
    }
    const geo = app.address ? await geocodeAddress(`${app.address}, Greece`) : null;
    const point = geo ?? GREECE_CENTROID;
    const tags = [PARTNER_OWNED_TAG, ...(geo ? [] : [NEEDS_GEOCODE_TAG])];
    const { data: created, error } = await admin
      .from('businesses')
      .insert({
        name: app.business_name,
        category_id: categoryId,
        description_i18n: (app.description ? { [app.locale]: app.description } : {}) as Json,
        lat: point.lat,
        lng: point.lng,
        address: app.address,
        phone: app.phone || null,
        billing_email: app.email || null,
        tags,
        verified: true,
        active: true,
      })
      .select('id')
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? 'insert_failed' };
    businessId = created.id;
  }

  const { error: ownerErr } = await admin
    .from('business_owners')
    .upsert(
      { auth_user_id: app.user_id, business_id: businessId },
      { onConflict: 'auth_user_id,business_id', ignoreDuplicates: true },
    );
  if (ownerErr) return { ok: false, error: ownerErr.message };

  const { error: appErr } = await admin
    .from('partner_applications')
    .update({ status: 'approved', business_id: businessId, ...reviewed })
    .eq('id', applicationId);
  if (appErr) return { ok: false, error: appErr.message };

  const { error: profErr } = await admin
    .from('profiles')
    .update({ partner_status: 'approved' })
    .eq('id', app.user_id);
  if (profErr) return { ok: false, error: profErr.message };

  revalidate();
  return { ok: true, businessId };
}

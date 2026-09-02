'use server';

import { headers } from 'next/headers';
import type { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import type { Json } from '@aga/db/types';
import { checkAndRecordRateLimit, hashRateKey } from '@/lib/rate-limit';
import { geocodeListing, GREECE_CENTROID } from '@/lib/geocode';
import {
  APPROX_LOCATION_TAG,
  listingRequestSchema,
  NEEDS_GEOCODE_TAG,
  SELF_SERVICE_TAG,
  type ListingRequestResult,
} from '@/lib/listing-request';

/**
 * Self-service "list your business" request.
 *
 * Inserts an *unverified* row into `businesses`. The public directory only
 * shows `verified = true`, so nothing goes live until an admin approves it in
 * the moderation queue (/admin/moderation). Rows are tagged so admins can tell
 * self-submitted requests from ones they created themselves.
 */

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.code;
  }
  return out;
}

export async function submitListingRequest(raw: unknown): Promise<ListingRequestResult> {
  const parsed = listingRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_input', fields: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  // Honeypot tripped → pretend success so bots don't learn anything.
  if (input.company) return { ok: true, needsGeocode: false };

  const admin = createSupabaseServiceClient();

  // Per-IP throttle (reuses the chat rate-limit table; fails open on DB errors).
  const secret = process.env.SESSION_HMAC_SECRET;
  if (secret) {
    const h = await headers();
    const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
    const { limited } = await checkAndRecordRateLimit(admin, {
      // Namespaced so listing submissions don't share a bucket with guest chat.
      ip: hashRateKey('ip', `listing-request:${ip}`, secret),
    });
    if (limited) return { ok: false, error: 'rate_limited' };
  }

  const { data: category } = await admin
    .from('business_categories')
    .select('id')
    .eq('id', input.categoryId)
    .maybeSingle();
  if (!category) return { ok: false, error: 'unknown_category' };

  const fullAddress = `${input.address}, ${input.area}`;

  const { data: existing } = await admin
    .from('businesses')
    .select('id')
    .ilike('name', input.name)
    .ilike('address', `%${input.area}%`)
    .limit(1);
  if (existing && existing.length > 0) return { ok: false, error: 'duplicate' };

  const geo = await geocodeListing({ address: input.address, area: input.area });
  const needsGeocode = geo === null;
  const point = geo ?? GREECE_CENTROID;

  const tags = [
    SELF_SERVICE_TAG,
    ...(needsGeocode ? [NEEDS_GEOCODE_TAG] : []),
    ...(geo?.precision === 'area' ? [APPROX_LOCATION_TAG] : []),
  ];

  const { error } = await admin.from('businesses').insert({
    name: input.name,
    category_id: input.categoryId,
    description_i18n: { [input.locale]: input.description } as Json,
    lat: point.lat,
    lng: point.lng,
    address: fullAddress,
    phone: input.phone,
    website: input.website ?? null,
    billing_email: input.email,
    tags,
    verified: false,
    active: true,
  });
  if (error) {
    console.error('listing request insert failed:', error.message);
    return { ok: false, error: 'save_failed' };
  }

  return { ok: true, needsGeocode };
}

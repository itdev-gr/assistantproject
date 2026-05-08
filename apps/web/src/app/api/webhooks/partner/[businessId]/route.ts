import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';

interface Ctx {
  params: Promise<{ businessId: string }>;
}

export const runtime = 'nodejs';

/**
 * Partner-side booking confirmation. The partner's POS or booking system POSTs
 * here with a signed body when a guest actually books. Body must include the
 * referral_id we issued (we plant it in the utm `ref` param on redirect).
 *
 * Headers:
 *   x-aga-signature: hex SHA256-HMAC of the raw body using businesses.webhook_secret
 *   x-aga-timestamp: unix seconds; rejected if older than 5 minutes (replay window)
 */
const bodySchema = z.object({
  referral_id: z.string().uuid(),
  external_booking_id: z.string().min(1).max(120).optional(),
  gross_amount: z.number().min(0).optional(),
  currency: z.string().length(3).default('EUR'),
  status: z.enum(['confirmed', 'cancelled', 'no_show']).default('confirmed'),
});

const REPLAY_WINDOW_SEC = 300;

export async function POST(req: NextRequest, ctx: Ctx) {
  const { businessId } = await ctx.params;
  const sig = req.headers.get('x-aga-signature') ?? '';
  const ts = req.headers.get('x-aga-timestamp') ?? '';
  const raw = await req.text();

  // Reject obviously stale timestamps before doing any DB work.
  const tsNum = Number.parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) {
    return NextResponse.json({ error: 'bad_timestamp' }, { status: 400 });
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
  if (skew > REPLAY_WINDOW_SEC) {
    return NextResponse.json({ error: 'stale' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, webhook_secret')
    .eq('id', businessId)
    .maybeSingle();
  if (!biz || !biz.webhook_secret) {
    return NextResponse.json({ error: 'no_webhook' }, { status: 404 });
  }

  const expected = createHmac('sha256', biz.webhook_secret).update(`${ts}.${raw}`).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  }

  const json = JSON.parse(raw);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { referral_id, gross_amount, currency, status } = parsed.data;

  // The referral must be for this business (via partnership.business_id)
  const { data: ref } = await supabase
    .from('referrals')
    .select(
      'id, partnership:partnerships ( id, business_id, hotel_id, commission_pct )',
    )
    .eq('id', referral_id)
    .maybeSingle();
  const partnership = (ref?.partnership ?? null) as
    | { id: string; business_id: string; hotel_id: string; commission_pct: number }
    | null;
  if (!ref || !partnership || partnership.business_id !== biz.id) {
    return NextResponse.json({ error: 'referral_not_found' }, { status: 404 });
  }

  // Idempotency: existing booking for this referral wins.
  const { data: existing } = await supabase
    .from('bookings')
    .select('id, status, gross_amount')
    .eq('referral_id', referral_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, booking_id: existing.id, deduplicated: true });
  }

  const { data: booking, error: insertErr } = await supabase
    .from('bookings')
    .insert({
      referral_id,
      status,
      gross_amount: gross_amount ?? null,
      currency,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      confirmation_source: 'partner_webhook',
    })
    .select('id')
    .single();
  if (insertErr || !booking) {
    return NextResponse.json({ error: insertErr?.message ?? 'insert_failed' }, { status: 500 });
  }

  const commission =
    status === 'confirmed' && gross_amount != null
      ? Math.round(gross_amount * Number(partnership.commission_pct)) / 100
      : 0;
  await supabase.from('commission_events').insert({
    booking_id: booking.id,
    partnership_id: partnership.id,
    commission_amount: commission,
    payable_to: 'platform',
    state: 'accrued',
  });

  return NextResponse.json({ ok: true, booking_id: booking.id, commission });
}

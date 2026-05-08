import { NextResponse, type NextRequest } from 'next/server';
import { verifyReferral } from '@aga/db/referral-token';
import { createSupabaseServiceClient } from '@aga/db/service';

interface Ctx {
  params: Promise<{ referralId: string }>;
}

export const runtime = 'nodejs';

/**
 * Verify the signed referral token, log the click, and 302 to the partner deep
 * link with utm params. The route param is the full token `<id>.<exp>.<sig>`.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { referralId: token } = await ctx.params;
  const secret = process.env.SESSION_HMAC_SECRET;
  if (!secret) return NextResponse.json({ error: 'misconfigured' }, { status: 500 });

  const parsed = verifyReferral(token, secret);
  if (!parsed) {
    return NextResponse.redirect(new URL('/?ref=invalid', req.url));
  }

  const supabase = createSupabaseServiceClient();

  const { data: ref } = await supabase
    .from('referrals')
    .select(
      `id, clicked_at, expires_at, partnership:partnerships (
        id,
        business:businesses ( website, phone, name ),
        hotel:hotels ( slug )
      )`,
    )
    .eq('id', parsed.referralId)
    .maybeSingle();

  if (!ref || !ref.partnership) {
    return NextResponse.redirect(new URL('/?ref=missing', req.url));
  }

  if (!ref.clicked_at) {
    await supabase
      .from('referrals')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', parsed.referralId)
      .is('clicked_at', null);
  }

  const partnership = ref.partnership as unknown as {
    id: string;
    business: { website: string | null; phone: string | null; name: string };
    hotel: { slug: string };
  };

  const target = partnership.business.website?.trim();
  const hotelSlug = partnership.hotel.slug;

  if (target) {
    const url = new URL(target);
    url.searchParams.set('utm_source', 'aga');
    url.searchParams.set('utm_medium', 'guest_assistant');
    url.searchParams.set('utm_campaign', hotelSlug);
    url.searchParams.set('ref', parsed.referralId);
    return NextResponse.redirect(url, 302);
  }

  const phone = partnership.business.phone?.replace(/[^+\d]/g, '');
  if (phone) {
    return NextResponse.redirect(`tel:${phone}`, 302);
  }
  return NextResponse.redirect(new URL('/?ref=no-target', req.url));
}

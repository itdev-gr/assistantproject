import { NextResponse, type NextRequest } from 'next/server';

interface Ctx {
  params: Promise<{ referralId: string }>;
}

/**
 * Stub for the referral redirect. Week 10 implements:
 * - HMAC verify the signed referral id
 * - log click_at on referrals row
 * - 302 to the partner deep link with utm params
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { referralId } = await ctx.params;
  return NextResponse.json({ referralId, status: 'stub' }, { status: 501 });
}

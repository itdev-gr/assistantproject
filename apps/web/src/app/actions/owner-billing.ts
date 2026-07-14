'use server';

import { createSupabaseServiceClient } from '@aga/db/service';
import { requireOwner } from '@/lib/auth-context';
import { getStripe } from '@/lib/stripe';

async function ensureHotelCustomer(
  hotelId: string,
  email: string,
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  const admin = createSupabaseServiceClient();
  const { data: hotel, error } = await admin
    .from('hotels')
    .select('id, name, stripe_customer_id')
    .eq('id', hotelId)
    .single();
  if (error || !hotel) return { ok: false, error: 'hotel_not_found' };
  if (hotel.stripe_customer_id) return { ok: true, customerId: hotel.stripe_customer_id };

  try {
    const customer = await getStripe().customers.create({
      email,
      name: hotel.name,
      metadata: { hotelId },
    });
    await admin.from('hotels').update({ stripe_customer_id: customer.id }).eq('id', hotelId);
    return { ok: true, customerId: customer.id };
  } catch (err) {
    console.error('ensureHotelCustomer stripe call failed', err instanceof Error ? err.message : err);
    return { ok: false, error: 'stripe_error' };
  }
}

export async function createHotelCheckout() {
  const ctx = await requireOwner();
  const price = process.env.STRIPE_PRICE_HOTEL;
  if (!price) return { ok: false as const, error: 'not_configured' };

  const customer = await ensureHotelCustomer(ctx.hotelId, ctx.email);
  if (!customer.ok) return { ok: false as const, error: customer.error };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const metadata = { kind: 'hotel_plan', hotelId: ctx.hotelId };

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customer.customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl}/owner/billing?status=success`,
      cancel_url: `${appUrl}/owner/billing?status=canceled`,
      metadata,
      subscription_data: { metadata },
    });
    if (!session.url) return { ok: false as const, error: 'stripe_no_url' };
    return { ok: true as const, url: session.url };
  } catch (err) {
    console.error('createHotelCheckout stripe call failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

export async function createPortalSession() {
  const ctx = await requireOwner();

  const customer = await ensureHotelCustomer(ctx.hotelId, ctx.email);
  if (!customer.ok) return { ok: false as const, error: customer.error };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customer.customerId,
      return_url: `${appUrl}/owner/billing`,
    });
    return { ok: true as const, url: session.url };
  } catch (err) {
    console.error('createPortalSession stripe call failed', err instanceof Error ? err.message : err);
    return { ok: false as const, error: 'stripe_error' };
  }
}

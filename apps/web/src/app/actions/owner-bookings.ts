'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireOwner } from '@/lib/auth-context';

const confirmSchema = z.object({
  referralId: z.string().uuid(),
  grossAmount: z.number().min(0).nullable(),
  currency: z.string().default('EUR'),
  notes: z.string().nullable(),
});

export type ConfirmInput = z.input<typeof confirmSchema>;

/**
 * Owner-side manual confirmation: a guest tells the hotel they booked, the
 * owner records it. Creates a bookings row in 'confirmed' state and an
 * accrued commission_event computed from the partnership's commission_pct.
 */
export async function confirmReferralBooked(input: ConfirmInput) {
  const ctx = await requireOwner();
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const { referralId, grossAmount, currency, notes } = parsed.data;

  const admin = createSupabaseServiceClient();

  // Verify the referral is for THIS owner's hotel before mutating.
  const { data: ref } = await admin
    .from('referrals')
    .select('id, partnership:partnerships ( id, hotel_id, commission_pct )')
    .eq('id', referralId)
    .maybeSingle();
  const partnership = (ref?.partnership ?? null) as
    | { id: string; hotel_id: string; commission_pct: number }
    | null;
  if (!ref || !partnership || partnership.hotel_id !== ctx.hotelId) {
    return { ok: false as const, error: 'not_found' };
  }

  // Idempotency: if a booking already exists for this referral, don't double-record.
  const { data: existing } = await admin
    .from('bookings')
    .select('id')
    .eq('referral_id', referralId)
    .maybeSingle();
  if (existing) return { ok: false as const, error: 'already_recorded' };

  const { data: booking, error: bookingErr } = await admin
    .from('bookings')
    .insert({
      referral_id: referralId,
      status: 'confirmed',
      gross_amount: grossAmount,
      currency,
      confirmed_at: new Date().toISOString(),
      confirmation_source: 'manual',
      notes,
    })
    .select('id')
    .single();
  if (bookingErr || !booking) return { ok: false as const, error: bookingErr?.message ?? 'failed' };

  // Compute commission. If amount unknown, store 0 with status accrued so the
  // record exists; the owner can edit later.
  const commission =
    grossAmount != null ? Math.round(grossAmount * Number(partnership.commission_pct)) / 100 : 0;
  const { error: commErr } = await admin.from('commission_events').insert({
    booking_id: booking.id,
    partnership_id: partnership.id,
    commission_amount: commission,
    payable_to: 'platform',
    state: 'accrued',
  });
  if (commErr) return { ok: false as const, error: commErr.message };

  revalidatePath('/[locale]/(owner)/owner/referrals', 'layout');
  revalidatePath('/[locale]/(owner)/owner/bookings', 'layout');
  return { ok: true as const, bookingId: booking.id, commission };
}

const updateBookingSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'no_show']),
  grossAmount: z.number().min(0).nullable(),
});

export async function updateBooking(input: z.input<typeof updateBookingSchema>) {
  const ctx = await requireOwner();
  const parsed = updateBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };
  const admin = createSupabaseServiceClient();

  // Hotel-scope check: the booking must reference a partnership for this hotel.
  const { data: existing } = await admin
    .from('bookings')
    .select(
      'id, referral:referrals ( partnership:partnerships ( id, hotel_id, commission_pct ) )',
    )
    .eq('id', parsed.data.bookingId)
    .maybeSingle();
  const partnership =
    ((existing?.referral as unknown as { partnership: { id: string; hotel_id: string; commission_pct: number } | null })
      ?.partnership ?? null);
  if (!existing || !partnership || partnership.hotel_id !== ctx.hotelId) {
    return { ok: false as const, error: 'not_found' };
  }

  const { error: updErr } = await admin
    .from('bookings')
    .update({
      status: parsed.data.status,
      gross_amount: parsed.data.grossAmount,
      confirmed_at:
        parsed.data.status === 'confirmed' ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.bookingId);
  if (updErr) return { ok: false as const, error: updErr.message };

  // Sync the commission event amount to match. Mark as cancelled-state when no longer confirmed.
  const newCommission =
    parsed.data.grossAmount != null
      ? Math.round(parsed.data.grossAmount * Number(partnership.commission_pct)) / 100
      : 0;
  await admin
    .from('commission_events')
    .update({
      commission_amount: parsed.data.status === 'confirmed' ? newCommission : 0,
    })
    .eq('booking_id', parsed.data.bookingId);

  revalidatePath('/[locale]/(owner)/owner/bookings', 'layout');
  return { ok: true as const };
}

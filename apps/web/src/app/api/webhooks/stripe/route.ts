import { NextResponse } from 'next/server';
import { after } from 'next/server';
import type Stripe from 'stripe';
import { createSupabaseServiceClient } from '@aga/db/service';
import { getStripe } from '@/lib/stripe';
import type { StripeEventLike } from '@/lib/stripe-billing-events';
import { processStoredEvent, reindexBusinessPartners } from '@/lib/business-billing-sync';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 500 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }

  const admin = createSupabaseServiceClient();

  // Idempotency: first delivery inserts; duplicates hit the PK and are ack'd.
  const { error: insertError } = await admin.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
    payload: JSON.parse(raw),
  });
  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Non-duplicate error: log and return 500 so Stripe retries
    console.error('stripe webhook event persist failed', event.id, insertError.message);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  const result = await processStoredEvent(admin, event as unknown as StripeEventLike);
  if (result.ok && result.businessIds.length > 0) {
    // Keep the assistant's index in step with listing changes (see lib).
    after(async () => {
      for (const id of result.businessIds) await reindexBusinessPartners(admin, id);
    });
  }
  // Always ack: a failed event stays with processed_at = null (+ error) for
  // the reconciler / admin replay. Stripe retries would not change the outcome.
  return NextResponse.json({ received: true, processed: result.ok });
}

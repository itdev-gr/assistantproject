import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createSupabaseServiceClient } from '@aga/db/service';
import { getStripe } from '@/lib/stripe';
import { applyStripeEvent, type BillingAction, type StripeEventLike } from '@/lib/stripe-billing-events';

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
    // Distinguish duplicate-key from transient failures
    if ((insertError as any).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Non-duplicate error: log and return 500 so Stripe retries
    console.error('stripe webhook event persist failed', event.id, insertError.message);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  try {
    for (const action of applyStripeEvent(event as unknown as StripeEventLike)) {
      await runAction(admin, action);
    }
    await admin
      .from('stripe_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', event.id);
  } catch (err) {
    // Ack anyway; the event row stays without processed_at for manual replay.
    console.error(`stripe webhook ${event.id} (${event.type}) processing failed`, err);
  }
  return NextResponse.json({ received: true });
}

async function runAction(admin: ReturnType<typeof createSupabaseServiceClient>, action: BillingAction) {
  const table =
    action.target === 'partnership' ? 'partnerships'
    : action.target === 'hotel' ? 'hotels'
    : 'commission_events';
  const entry = Object.entries(action.match)[0];
  if (!entry) throw new Error(`${table} update missing match column`);
  const [column, value] = entry;
  const { error } = await admin.from(table).update(action.set).eq(column, value as string);
  if (error) throw new Error(`${table} update failed: ${error.message}`);
}

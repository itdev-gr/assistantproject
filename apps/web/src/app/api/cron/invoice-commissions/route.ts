import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@aga/db/service';
import { getStripe } from '@/lib/stripe';
import { groupAccruedCommissions, type AccruedRow } from '@/lib/commission-invoicing';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from('commission_events')
    .select(
      'id, commission_amount, partnership:partnerships ( business:businesses ( id, name, stripe_customer_id ) )',
    )
    .eq('state', 'accrued');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: AccruedRow[] = (data ?? []).map((e) => {
    const business = (e.partnership as { business: { id: string; name: string; stripe_customer_id: string | null } } | null)?.business;
    return {
      id: e.id as string,
      commission_amount: Number(e.commission_amount),
      currency: 'EUR',
      business_id: business?.id ?? '',
      business_name: business?.name ?? 'Unknown business',
      stripe_customer_id: business?.stripe_customer_id ?? null,
    };
  });

  const stripe = getStripe();
  const results: { customerId: string; invoiceId: string; totalCents: number }[] = [];
  const failures: { customerId: string; error: string }[] = [];
  for (const batch of groupAccruedCommissions(rows)) {
    try {
      const invoice = await stripe.invoices.create({
        customer: batch.customerId,
        collection_method: 'send_invoice',
        days_until_due: 14,
        description: `Referral commissions — ${batch.businessName}`,
      });
      for (const item of batch.items) {
        await stripe.invoiceItems.create({
          customer: batch.customerId,
          invoice: invoice.id,
          amount: item.cents,
          currency: 'eur',
          description: item.description,
        });
      }
      // Mark events invoiced BEFORE finalize/send: once this succeeds, a later
      // failure (finalize/send) cannot cause duplicate billing on the next run.
      const { error: dbError } = await admin
        .from('commission_events')
        .update({ state: 'invoiced', stripe_invoice_id: invoice.id })
        .in('id', batch.eventIds);
      if (dbError) {
        // Avoid leaving an orphan draft invoice in Stripe when we can't record
        // it. The invoice is still a draft at this point, so it must be
        // deleted (voidInvoice only works on finalized invoices).
        await stripe.invoices.del(invoice.id);
        failures.push({ customerId: batch.customerId, error: dbError.message });
        continue;
      }
      await stripe.invoices.finalizeInvoice(invoice.id);
      await stripe.invoices.sendInvoice(invoice.id);
      results.push({ customerId: batch.customerId, invoiceId: invoice.id, totalCents: batch.totalCents });
    } catch (err) {
      // If we got past the DB update, commission_events already say 'invoiced'
      // and the Stripe invoice (draft or finalized) exists and can be sent
      // manually from the dashboard — no re-billing on the next run.
      console.error('invoice-commissions batch failed', batch.customerId, err instanceof Error ? err.message : err);
      failures.push({ customerId: batch.customerId, error: 'stripe_error' });
    }
  }
  return NextResponse.json({ invoiced: results, failed: failures });
}

import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import { groupAccruedCommissions, type AccruedRow } from './commission-invoicing';

type DB = SupabaseClient<Database>;

export interface CommissionInvoicingResult {
  invoiced: { customerId: string; invoiceId: string; totalCents: number }[];
  failed: { customerId: string; error: string }[];
}

/**
 * Core of the accrued-commission invoicing flow. Shared by the nightly cron
 * route and the manual admin trigger so both run identical logic: invoiced
 * status is written BEFORE finalize/send (so a later Stripe failure can't
 * cause duplicate billing on the next run), each customer batch is isolated
 * (one batch's failure doesn't stop the others), and a draft invoice is
 * deleted from Stripe if the DB write to mark it invoiced fails.
 */
export async function runCommissionInvoicing(admin: DB, stripe: Stripe): Promise<CommissionInvoicingResult> {
  const { data, error } = await admin
    .from('commission_events')
    .select(
      'id, commission_amount, partnership:partnerships ( business:businesses ( id, name, stripe_customer_id ) )',
    )
    .eq('state', 'accrued');
  if (error) throw new Error(error.message);

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

  const results: CommissionInvoicingResult['invoiced'] = [];
  const failures: CommissionInvoicingResult['failed'] = [];
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
  return { invoiced: results, failed: failures };
}

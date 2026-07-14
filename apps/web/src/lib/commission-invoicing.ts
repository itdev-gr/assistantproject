/** Pure grouping of accrued commission rows into per-customer invoice batches. */
export interface AccruedRow {
  id: string;
  commission_amount: number;
  currency: string;
  business_id: string;
  business_name: string;
  stripe_customer_id: string | null;
}

export interface CustomerBatch {
  customerId: string;
  businessName: string;
  eventIds: string[];
  totalCents: number;
  items: { eventId: string; cents: number; description: string }[];
}

export function groupAccruedCommissions(rows: AccruedRow[]): CustomerBatch[] {
  const byCustomer = new Map<string, CustomerBatch>();
  for (const r of rows) {
    if (!r.stripe_customer_id) continue;
    const cents = Math.round(r.commission_amount * 100);
    let batch = byCustomer.get(r.stripe_customer_id);
    if (!batch) {
      batch = { customerId: r.stripe_customer_id, businessName: r.business_name, eventIds: [], totalCents: 0, items: [] };
      byCustomer.set(r.stripe_customer_id, batch);
    }
    batch.eventIds.push(r.id);
    batch.totalCents += cents;
    batch.items.push({ eventId: r.id, cents, description: `Referral commission ${r.id} — ${r.business_name}` });
  }
  return [...byCustomer.values()];
}

import { describe, expect, it } from 'vitest';
import { groupAccruedCommissions, type AccruedRow } from './commission-invoicing';

const row = (over: Partial<AccruedRow>): AccruedRow => ({
  id: 'ce-1',
  commission_amount: 10,
  currency: 'EUR',
  business_id: 'b-1',
  business_name: 'Taverna',
  stripe_customer_id: 'cus_1',
  ...over,
});

describe('groupAccruedCommissions', () => {
  it('groups events by Stripe customer with cent amounts', () => {
    const batches = groupAccruedCommissions([
      row({ id: 'ce-1', commission_amount: 10.5 }),
      row({ id: 'ce-2', commission_amount: 4.25 }),
      row({ id: 'ce-3', business_id: 'b-2', business_name: 'Bar', stripe_customer_id: 'cus_2' }),
    ]);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toEqual({
      customerId: 'cus_1',
      businessName: 'Taverna',
      eventIds: ['ce-1', 'ce-2'],
      totalCents: 1475,
      items: [
        { eventId: 'ce-1', cents: 1050, description: 'Referral commission ce-1 — Taverna' },
        { eventId: 'ce-2', cents: 425, description: 'Referral commission ce-2 — Taverna' },
      ],
    });
  });

  it('skips businesses without a Stripe customer', () => {
    const batches = groupAccruedCommissions([row({ stripe_customer_id: null })]);
    expect(batches).toEqual([]);
  });

  it('rounds to whole cents', () => {
    const batches = groupAccruedCommissions([row({ commission_amount: 0.005 })]);
    expect(batches[0]?.items[0]?.cents).toBe(1);
  });
});

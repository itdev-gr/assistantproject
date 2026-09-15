import { describe, expect, it } from 'vitest';
import {
  createBusinessConnectionRequestSchema,
  createHotelConnectionRequestSchema,
  decideConnectionRequestSchema,
} from '@aga/api-contracts';

const business = '11111111-1111-1111-1111-111111111111';
const hotel = '22222222-2222-2222-2222-222222222222';
const message = 'We would love to recommend you to our guests this summer.';

describe('createHotelConnectionRequestSchema', () => {
  it('accepts a message-only request', () => {
    const r = createHotelConnectionRequestSchema.safeParse({ businessId: business, message });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.proposedCommissionPct).toBeUndefined();
      expect(r.data.guestOffer).toBeUndefined();
    }
  });

  it('treats empty extras as absent and coerces numeric strings', () => {
    const r = createHotelConnectionRequestSchema.safeParse({
      businessId: business,
      message,
      proposedCommissionPct: '7.5',
      guestOffer: '   ',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.proposedCommissionPct).toBe(7.5);
      expect(r.data.guestOffer).toBeUndefined();
    }
  });

  it('rejects short messages, out-of-range commission and long offers', () => {
    expect(
      createHotelConnectionRequestSchema.safeParse({ businessId: business, message: 'hi' }).success,
    ).toBe(false);
    expect(
      createHotelConnectionRequestSchema.safeParse({
        businessId: business,
        message,
        proposedCommissionPct: 120,
      }).success,
    ).toBe(false);
    expect(
      createHotelConnectionRequestSchema.safeParse({
        businessId: business,
        message,
        guestOffer: 'x'.repeat(201),
      }).success,
    ).toBe(false);
  });
});

describe('createBusinessConnectionRequestSchema', () => {
  it('requires both ids', () => {
    expect(
      createBusinessConnectionRequestSchema.safeParse({ hotelId: hotel, message }).success,
    ).toBe(false);
    expect(
      createBusinessConnectionRequestSchema.safeParse({
        hotelId: hotel,
        businessId: business,
        message,
      }).success,
    ).toBe(true);
  });
});

describe('decideConnectionRequestSchema', () => {
  it('allows a reason only when declining', () => {
    const base = { requestId: business };
    expect(decideConnectionRequestSchema.safeParse({ ...base, accept: true }).success).toBe(true);
    expect(
      decideConnectionRequestSchema.safeParse({
        ...base,
        accept: false,
        declineReason: 'Fully booked',
      }).success,
    ).toBe(true);
    const r = decideConnectionRequestSchema.safeParse({
      ...base,
      accept: true,
      declineReason: 'x',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(String(r.error.issues[0]?.path[0])).toBe('declineReason');
  });
});

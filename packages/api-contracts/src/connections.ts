import { z } from 'zod';
import { MAX_COMMISSION_PCT, uuidSchema } from './common';

/**
 * Partnership connection requests (hotel ⇄ business). Field limits mirror the
 * CHECK constraints in migration 0015.
 */

export const connectionRequestStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'cancelled',
]);
export type ConnectionRequestStatus = z.infer<typeof connectionRequestStatusSchema>;

export const connectionInitiatorSchema = z.enum(['hotel', 'business']);
export type ConnectionInitiator = z.infer<typeof connectionInitiatorSchema>;

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().min(1).max(max).optional(),
  );

const optionalPct = z.preprocess(
  (v) => (v === '' || v === null ? undefined : typeof v === 'string' ? Number(v) : v),
  z.number().min(0).max(MAX_COMMISSION_PCT).optional(),
);

/** Optional extras the sender may attach to a request. */
export const connectionExtrasSchema = z.object({
  /** Commission on referrals the sender proposes; the receiver accepts as-is. */
  proposedCommissionPct: optionalPct,
  /** Perk for the hotel's guests, shown in the assistant once connected. */
  guestOffer: optionalTrimmed(200),
});
export type ConnectionExtras = z.infer<typeof connectionExtrasSchema>;

const message = z.string().trim().min(10).max(1000);

/** Hotel → business. The hotel comes from the caller's JWT. */
export const createHotelConnectionRequestSchema = connectionExtrasSchema.extend({
  businessId: uuidSchema,
  message,
});
export type CreateHotelConnectionRequest = z.infer<typeof createHotelConnectionRequestSchema>;

/** Business → hotel. `businessId` must be one the caller owns. */
export const createBusinessConnectionRequestSchema = connectionExtrasSchema.extend({
  hotelId: uuidSchema,
  businessId: uuidSchema,
  message,
});
export type CreateBusinessConnectionRequest = z.infer<typeof createBusinessConnectionRequestSchema>;

export const decideConnectionRequestSchema = z
  .object({
    requestId: uuidSchema,
    accept: z.boolean(),
    declineReason: optionalTrimmed(500),
  })
  .refine((v) => !v.accept || !v.declineReason, {
    message: 'declineReason only applies when declining',
    path: ['declineReason'],
  });
export type DecideConnectionRequest = z.infer<typeof decideConnectionRequestSchema>;

export const connectionRequestIdSchema = z.object({ requestId: uuidSchema });
export const partnershipIdSchema = z.object({ partnershipId: uuidSchema });

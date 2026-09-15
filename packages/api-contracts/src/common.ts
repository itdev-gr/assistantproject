import { z } from 'zod';

export const localeSchema = z.enum(['el', 'en']);
export type Locale = z.infer<typeof localeSchema>;

export const subscriptionTierSchema = z.enum(['free', 'standard', 'featured', 'exclusive']);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

/** Hotel / accommodation packages (see apps/web/src/lib/hotel-plans.ts). */
export const hotelPlanSchema = z.enum([
  'accommodation',
  'basic',
  'professional',
  'advanced',
  'enterprise',
]);
export type HotelPlan = z.infer<typeof hotelPlanSchema>;

/** Commission on referrals is capped at 10% ("up to 10%, depending on the partnership"). */
export const MAX_COMMISSION_PCT = 10;

export const hotelRoleSchema = z.enum(['owner', 'manager', 'staff']);
export type HotelRole = z.infer<typeof hotelRoleSchema>;

export const uuidSchema = z.string().uuid();

export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, hyphens only');

export const isoDateSchema = z.string().datetime();

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

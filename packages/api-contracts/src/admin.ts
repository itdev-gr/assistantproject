import { z } from 'zod';
import { slugSchema, subscriptionTierSchema, uuidSchema } from './common';

/** A value that's either a real URL, or empty/null (treated as not provided). */
const optionalUrl = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.string().url().nullable(),
);

const optionalText = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.string().nullable(),
);

const optionalEmail = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.string().email().nullable(),
);

/** Accepts a comma-separated string from a text input, or an actual array. */
const tagsField = z.preprocess(
  (v) =>
    typeof v === 'string'
      ? v.split(',').map((s) => s.trim()).filter(Boolean)
      : v,
  z.array(z.string()).default([]),
);

/**
 * `opening_hours_json` contract (also relied on by `isOpenNow` and live
 * data): keys are the 7 day abbreviations below; a day's value is `[]`
 * (closed that day) or a single `[open, close]` "HH:MM" interval; a day
 * key that's absent means "unknown". One interval per day is sufficient.
 */
const openingHoursDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const openingHoursTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const openingHoursDaySchema = z.union([
  z.tuple([]),
  z.tuple([z.tuple([openingHoursTime, openingHoursTime])]),
]);
export const openingHoursSchema = z.record(z.enum(openingHoursDayKeys), openingHoursDaySchema);
export type OpeningHoursValue = z.infer<typeof openingHoursSchema>;

export const businessUpsertSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(2).max(120),
  categoryId: uuidSchema,
  description: z.record(z.string(), z.string()).nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(500),
  phone: optionalText,
  whatsapp: optionalText,
  website: optionalUrl,
  billingEmail: optionalEmail,
  priceBand: z.number().int().min(1).max(4),
  tags: tagsField,
  openingHours: openingHoursSchema.optional(),
  images: z.array(z.string().url()).default([]),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type BusinessUpsert = z.infer<typeof businessUpsertSchema>;

export const businessCategoryUpsertSchema = z.object({
  id: uuidSchema.optional(),
  slug: slugSchema,
  nameI18n: z.record(z.string(), z.string()),
  parentId: uuidSchema.nullable(),
});
export type BusinessCategoryUpsert = z.infer<typeof businessCategoryUpsertSchema>;

export const partnershipUpsertSchema = z.object({
  id: uuidSchema.optional(),
  hotelId: uuidSchema,
  businessId: uuidSchema,
  commissionPct: z.number().min(0).max(100),
  paidPriorityScore: z.number().int().min(0).max(100),
  subscriptionTier: subscriptionTierSchema,
  contractStarts: z.string().date().nullable(),
  contractEnds: z.string().date().nullable(),
  active: z.boolean().default(true),
  notes: z.string().nullable(),
});
export type PartnershipUpsert = z.infer<typeof partnershipUpsertSchema>;

export const recommendationRulesUpsertSchema = z.object({
  hotelId: uuidSchema.nullable(),
  semanticWeight: z.number().min(0).max(10),
  proximityWeight: z.number().min(0).max(10),
  timeMatchWeight: z.number().min(0).max(10),
  categoryWeight: z.number().min(0).max(10),
  preferenceWeight: z.number().min(0).max(10),
  partnerBiasWeight: z.number().min(0).max(10),
  distancePenaltyPerKm: z.number().min(0).max(10),
  tierMultipliers: z.object({
    free: z.number().min(0.5).max(3),
    standard: z.number().min(0.5).max(3),
    featured: z.number().min(0.5).max(3),
    exclusive: z.number().min(0.5).max(3),
  }),
  maxResults: z.number().int().min(1).max(20),
});
export type RecommendationRulesUpsert = z.infer<typeof recommendationRulesUpsertSchema>;

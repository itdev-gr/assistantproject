import { z } from 'zod';
import { slugSchema, subscriptionTierSchema, uuidSchema } from './common';

export const businessUpsertSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(2).max(120),
  categoryId: uuidSchema,
  description: z.record(z.string(), z.string()).nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(500),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  website: z.string().url().nullable(),
  priceBand: z.number().int().min(1).max(4),
  tags: z.array(z.string()).default([]),
  openingHours: z.record(z.string(), z.unknown()).nullable(),
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

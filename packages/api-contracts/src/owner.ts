import { z } from 'zod';
import { localeSchema, slugSchema, uuidSchema } from './common';

export const hotelProfileSchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
  timezone: z.string(),
  defaultLocale: localeSchema,
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  brand: z
    .object({
      logoUrl: z.string().url().nullable(),
      primaryColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .nullable(),
    })
    .partial(),
});
export type HotelProfile = z.infer<typeof hotelProfileSchema>;

export const faqUpsertSchema = z.object({
  id: uuidSchema.optional(),
  locale: localeSchema,
  question: z.string().min(3).max(500),
  answer: z.string().min(3).max(4000),
  tags: z.array(z.string()).default([]),
  intentSlug: z.string().nullable(),
  published: z.boolean().default(false),
});
export type FaqUpsert = z.infer<typeof faqUpsertSchema>;

export const amenityUpsertSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).nullable(),
  locationOnProperty: z.string().nullable(),
  hours: z.record(z.string(), z.unknown()).nullable(),
  published: z.boolean().default(false),
});
export type AmenityUpsert = z.infer<typeof amenityUpsertSchema>;

export const hoursRowSchema = z.object({
  id: uuidSchema.optional(),
  entityType: z.enum([
    'reception',
    'breakfast',
    'lunch',
    'dinner',
    'pool',
    'bar',
    'spa',
    'gym',
    'checkin',
    'checkout',
    'amenity',
  ]),
  entityRef: uuidSchema.nullable(),
  weekday: z.number().int().min(0).max(6),
  opens: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/),
  closes: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/),
  seasonalStart: z.string().date().nullable(),
  seasonalEnd: z.string().date().nullable(),
});
export type HoursRow = z.infer<typeof hoursRowSchema>;

export const policyUpsertSchema = z.object({
  id: uuidSchema.optional(),
  kind: z.enum(['pets', 'smoking', 'cancellation', 'payment', 'noise']),
  body: z.string().min(3).max(4000),
  locale: localeSchema,
});
export type PolicyUpsert = z.infer<typeof policyUpsertSchema>;

export const roomUpsertSchema = z.object({
  id: uuidSchema.optional(),
  code: z.string().min(1).max(32),
  floor: z.number().int().nullable(),
  view: z.string().nullable(),
  notes: z.string().max(1000).nullable(),
});
export type RoomUpsert = z.infer<typeof roomUpsertSchema>;

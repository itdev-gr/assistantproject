import { z } from 'zod';
import { localeSchema, uuidSchema } from './common';

export const messageRoleSchema = z.enum(['guest', 'assistant', 'system']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const chatMessageSchema = z.object({
  id: uuidSchema,
  role: messageRoleSchema,
  content: z.string(),
  intent: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const recommendationCardSchema = z.object({
  businessId: uuidSchema,
  name: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  distanceKm: z.number().nullable(),
  openNow: z.boolean().nullable(),
  priceBand: z.number().int().min(1).max(4).nullable(),
  imageUrl: z.string().url().nullable(),
  promoted: z.boolean(),
  referralUrl: z.string().url(),
});
export type RecommendationCard = z.infer<typeof recommendationCardSchema>;

export const chatRequestSchema = z.object({
  hotelSlug: z.string(),
  message: z.string().min(1).max(2000),
  locale: localeSchema.optional(),
  roomId: uuidSchema.optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  reply: z.string(),
  intent: z.string(),
  recommendations: z.array(recommendationCardSchema).optional(),
  needsStaff: z.boolean().optional(),
  sessionId: uuidSchema,
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

import { z } from 'zod';
import { localeSchema, uuidSchema } from './common';
import { businessUpsertSchema } from './admin';

export const accountRoleSchema = z.enum(['user', 'partner']);
export type AccountRole = z.infer<typeof accountRoleSchema>;

export const partnerStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type PartnerStatus = z.infer<typeof partnerStatusSchema>;

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

/**
 * Self-serve signup. Partner applicants must describe the business they want
 * to list; the fields travel as auth metadata and are persisted by the
 * `handle_new_user` trigger.
 */
export const signUpSchema = z
  .object({
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(128),
    role: accountRoleSchema.default('user'),
    displayName: z.string().trim().max(80).optional(),
    locale: localeSchema.default('el'),
    businessName: z.string().trim().max(120).optional(),
    businessCategoryId: z.string().trim().optional(),
    businessPhone: z.string().trim().max(40).optional(),
    businessAddress: z.string().trim().max(300).optional(),
    businessDescription: z.string().trim().max(1200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role !== 'partner') return;
    if (!v.businessName || v.businessName.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['businessName'], message: 'required' });
    }
    if (!v.businessCategoryId || !uuidSchema.safeParse(v.businessCategoryId).success) {
      ctx.addIssue({ code: 'custom', path: ['businessCategoryId'], message: 'required' });
    }
    if (!v.businessPhone || v.businessPhone.length < 6) {
      ctx.addIssue({ code: 'custom', path: ['businessPhone'], message: 'required' });
    }
    if (!v.businessAddress || v.businessAddress.length < 3) {
      ctx.addIssue({ code: 'custom', path: ['businessAddress'], message: 'required' });
    }
  });
export type SignUpInput = z.input<typeof signUpSchema>;

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().max(80).nullable(),
  avatarUrl: z.string().trim().url().max(500).nullable(),
  locale: localeSchema,
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export const businessIdSchema = z.object({ businessId: uuidSchema });

/** Columns a business owner may edit (mirrors the column grant in 0014). */
export const partnerBusinessUpdateSchema = businessUpsertSchema
  .pick({
    name: true,
    description: true,
    phone: true,
    whatsapp: true,
    website: true,
    priceBand: true,
    tags: true,
    openingHours: true,
    images: true,
  })
  .extend({ id: uuidSchema });
export type PartnerBusinessUpdate = z.infer<typeof partnerBusinessUpdateSchema>;

export const partnerDecisionSchema = z
  .object({
    applicationId: uuidSchema,
    approve: z.boolean(),
    /** Link the applicant to an existing listing instead of creating a new one. */
    existingBusinessId: uuidSchema.optional(),
    rejectionReason: trimmed(0, 500).optional(),
  })
  .refine((v) => v.approve || !v.existingBusinessId, {
    message: 'existingBusinessId only applies to approvals',
    path: ['existingBusinessId'],
  });
export type PartnerDecision = z.infer<typeof partnerDecisionSchema>;

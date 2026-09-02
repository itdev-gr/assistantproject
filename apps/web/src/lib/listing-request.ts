import { z } from 'zod';

/**
 * Shared contract for the self-service "list your business" request.
 * Kept outside the server-action module because `'use server'` files may only
 * export async functions.
 */

/** Tag set on every self-submitted row (moderation UI keys off this). */
export const SELF_SERVICE_TAG = 'self-service';
/** Added when geocoding failed and the pin is a country-level placeholder. */
export const NEEDS_GEOCODE_TAG = 'needs-geocode';
/** Added when only the town/area could be geocoded (pin is approximate). */
export const APPROX_LOCATION_TAG = 'approx-location';

const optionalTrimmed = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

const websiteSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  })
  .pipe(z.string().url().optional());

export const listingRequestSchema = z.object({
  locale: z.enum(['el', 'en']).default('el'),
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().uuid(),
  area: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(300),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(200),
  website: websiteSchema,
  description: z.string().trim().min(20).max(1200),
  /** Honeypot — real users never fill this. */
  company: optionalTrimmed,
});

export type ListingRequestInput = z.input<typeof listingRequestSchema>;

export type ListingRequestErrorCode =
  | 'invalid_input'
  | 'rate_limited'
  | 'duplicate'
  | 'unknown_category'
  | 'save_failed';

export type ListingRequestResult =
  | { ok: true; needsGeocode: boolean }
  | { ok: false; error: ListingRequestErrorCode; fields?: Record<string, string> };

export const LISTING_ERROR_TEXT: Record<ListingRequestErrorCode, { en: string; el: string }> = {
  invalid_input: {
    en: 'Please check the highlighted fields.',
    el: 'Ελέγξτε τα επισημασμένα πεδία.',
  },
  rate_limited: {
    en: 'Too many requests from this connection. Please try again in a few minutes.',
    el: 'Πολλές αιτήσεις από αυτή τη σύνδεση. Δοκιμάστε ξανά σε λίγα λεπτά.',
  },
  duplicate: {
    en: 'A business with this name in this area is already in our list. If it is yours, contact us to claim it.',
    el: 'Υπάρχει ήδη επιχείρηση με αυτό το όνομα σε αυτή την περιοχή. Αν είναι δική σας, επικοινωνήστε μαζί μας.',
  },
  unknown_category: {
    en: 'Please choose a category.',
    el: 'Επιλέξτε κατηγορία.',
  },
  save_failed: {
    en: 'We could not save your request. Please try again.',
    el: 'Δεν μπορέσαμε να αποθηκεύσουμε την αίτησή σας. Δοκιμάστε ξανά.',
  },
};

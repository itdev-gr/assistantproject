/**
 * Business (partner) plans — the single source of truth for what the pricing
 * page, the signup picker and the billing screens display. Amounts must match
 * the Stripe prices referenced by STRIPE_PRICE_STANDARD / STRIPE_PRICE_FEATURED;
 * the nightly billing reconciler reports `price_drift` when they diverge (see
 * billing-reconcile.ts). All plans are billed yearly.
 *
 * The DB tier keys (`standard`, `featured`) predate the 2026 price list and
 * are kept for compatibility; the public names are "Business" and
 * "Premium Partner". `exclusive` still exists in the DB enum for legacy rows
 * but is no longer sold.
 */

export type PaidTier = 'standard' | 'featured';

/** Every subscription on the platform renews yearly. */
export const BILLING_INTERVAL = 'year' as const;

export interface Plan {
  tier: PaidTier;
  /** Yearly price in euro cents, VAT included. */
  cents: number;
  priceEnv: 'STRIPE_PRICE_STANDARD' | 'STRIPE_PRICE_FEATURED';
  /** Stripe price lookup key created by scripts/setup-stripe-products.ts. */
  lookupKey: string;
  name: { en: string; el: string };
  tagline: { en: string; el: string };
  features: Array<{ en: string; el: string }>;
  /** Visually emphasised card on the pricing page. */
  highlight?: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    tier: 'standard',
    cents: 14900,
    priceEnv: 'STRIPE_PRICE_STANDARD',
    lookupKey: 'partner_business_yearly',
    name: { en: 'Business', el: 'Business' },
    tagline: { en: 'Get listed and found.', el: 'Μπείτε στον οδηγό και βρεθείτε.' },
    features: [
      {
        en: 'Verified listing in the RoomRiv guide',
        el: 'Επαληθευμένη καταχώριση στον οδηγό RoomRiv',
      },
      {
        en: 'Photos, opening hours, description and contact details',
        el: 'Φωτογραφίες, ωράρια, περιγραφή και στοιχεία επικοινωνίας',
      },
      {
        en: 'Connect with partner hotels and receive guest referrals',
        el: 'Συνδεθείτε με συνεργαζόμενα ξενοδοχεία και δεχθείτε συστάσεις επισκεπτών',
      },
      { en: 'Eligible for AI assistant suggestions', el: 'Επιλέξιμη για προτάσεις του AI βοηθού' },
    ],
  },
  {
    tier: 'featured',
    cents: 29900,
    priceEnv: 'STRIPE_PRICE_FEATURED',
    lookupKey: 'partner_premium_yearly',
    name: { en: 'Premium Partner', el: 'Premium Partner' },
    tagline: { en: 'Stand out to travellers.', el: 'Ξεχωρίστε στους ταξιδιώτες.' },
    highlight: true,
    features: [
      { en: 'Everything in Business', el: 'Όλα όσα έχει το Business' },
      { en: '“Featured” badge on your listing', el: 'Σήμα «Προτεινόμενο» στην καταχώρισή σας' },
      {
        en: 'Placement in the homepage featured strip',
        el: 'Θέση στα προτεινόμενα της αρχικής σελίδας',
      },
      {
        en: 'Higher weight in AI assistant suggestions among relevant places',
        el: 'Μεγαλύτερο βάρος στις προτάσεις του AI βοηθού ανάμεσα σε σχετικά μέρη',
      },
      {
        en: 'Priority support from the RoomRiv team',
        el: 'Προτεραιότητα στην υποστήριξη από την ομάδα RoomRiv',
      },
    ],
  },
] as const;

/** Who the business plans are for (pricing page copy). */
export const BUSINESS_AUDIENCE = {
  en: 'Restaurants, bars, cafés, activities, experiences, tours, transfers, attractions, wellness & spa and other partner businesses.',
  el: 'Εστιατόρια, bars, cafés, activities, experiences, tours, transfers, attractions, wellness/spa και λοιπές συνεργαζόμενες επιχειρήσεις.',
} as const;

export const PAID_TIERS: readonly PaidTier[] = PLANS.map((p) => p.tier);

export function planFor(tier: string | null | undefined): Plan | null {
  return PLANS.find((p) => p.tier === tier) ?? null;
}

export function isPaidTier(value: unknown): value is PaidTier {
  return typeof value === 'string' && (PAID_TIERS as readonly string[]).includes(value);
}

/** "149 €" style formatting (whole euros; cents only when non-zero). */
export function formatEuro(cents: number, locale: string): string {
  const euros = cents / 100;
  return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

/**
 * Partner plans — the single source of truth for what the pricing page and
 * the signup picker display. Amounts must match the Stripe prices referenced
 * by STRIPE_PRICE_STANDARD / FEATURED / EXCLUSIVE; the billing reconciler
 * reports `price_drift` when they diverge (see billing-reconcile.ts).
 */

export type PaidTier = 'standard' | 'featured' | 'exclusive';

export interface Plan {
  tier: PaidTier;
  /** Monthly price in euro cents, VAT included. */
  cents: number;
  priceEnv: 'STRIPE_PRICE_STANDARD' | 'STRIPE_PRICE_FEATURED' | 'STRIPE_PRICE_EXCLUSIVE';
  name: { en: string; el: string };
  tagline: { en: string; el: string };
  features: Array<{ en: string; el: string }>;
  /** Visually emphasised card on the pricing page. */
  highlight?: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    tier: 'standard',
    cents: 2900,
    priceEnv: 'STRIPE_PRICE_STANDARD',
    name: { en: 'Standard', el: 'Standard' },
    tagline: { en: 'Get listed and found.', el: 'Μπείτε στον οδηγό και βρεθείτε.' },
    features: [
      { en: 'Verified listing in the Roomriv guide', el: 'Επαληθευμένη καταχώριση στον οδηγό Roomriv' },
      { en: 'Photos, opening hours, description and contact details', el: 'Φωτογραφίες, ωράρια, περιγραφή και στοιχεία επικοινωνίας' },
      { en: 'Connect with partner hotels and receive guest referrals', el: 'Συνδεθείτε με συνεργαζόμενα ξενοδοχεία και δεχθείτε συστάσεις επισκεπτών' },
      { en: 'Eligible for AI assistant suggestions', el: 'Επιλέξιμη για προτάσεις του AI βοηθού' },
    ],
  },
  {
    tier: 'featured',
    cents: 5900,
    priceEnv: 'STRIPE_PRICE_FEATURED',
    name: { en: 'Featured', el: 'Featured' },
    tagline: { en: 'Stand out to travellers.', el: 'Ξεχωρίστε στους ταξιδιώτες.' },
    highlight: true,
    features: [
      { en: 'Everything in Standard', el: 'Όλα όσα έχει το Standard' },
      { en: '“Featured” badge on your listing', el: 'Σήμα «Προτεινόμενο» στην καταχώρισή σας' },
      { en: 'Placement in the homepage featured strip', el: 'Θέση στα προτεινόμενα της αρχικής σελίδας' },
      { en: 'Higher weight in AI assistant suggestions among relevant places', el: 'Μεγαλύτερο βάρος στις προτάσεις του AI βοηθού ανάμεσα σε σχετικά μέρη' },
    ],
  },
  {
    tier: 'exclusive',
    cents: 9900,
    priceEnv: 'STRIPE_PRICE_EXCLUSIVE',
    name: { en: 'Exclusive', el: 'Exclusive' },
    tagline: { en: 'Maximum visibility.', el: 'Μέγιστη προβολή.' },
    features: [
      { en: 'Everything in Featured', el: 'Όλα όσα έχει το Featured' },
      { en: 'Top weight in AI assistant suggestions among relevant places', el: 'Το μεγαλύτερο βάρος στις προτάσεις του AI βοηθού ανάμεσα σε σχετικά μέρη' },
      { en: 'Priority position in the featured strip', el: 'Προτεραιότητα στα προτεινόμενα της αρχικής' },
      { en: 'Priority support from the Roomriv team', el: 'Προτεραιότητα στην υποστήριξη από την ομάδα Roomriv' },
    ],
  },
] as const;

export const PAID_TIERS: readonly PaidTier[] = PLANS.map((p) => p.tier);

export function planFor(tier: string | null | undefined): Plan | null {
  return PLANS.find((p) => p.tier === tier) ?? null;
}

export function isPaidTier(value: unknown): value is PaidTier {
  return typeof value === 'string' && (PAID_TIERS as readonly string[]).includes(value);
}

/** "29 €" style formatting (whole euros; cents only when non-zero). */
export function formatEuro(cents: number, locale: string): string {
  const euros = cents / 100;
  return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

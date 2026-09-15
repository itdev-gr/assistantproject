/**
 * Hotel & accommodation plans — the single source of truth for the pricing
 * page, the owner billing screen and the admin tenant forms. Amounts must
 * match the yearly Stripe prices referenced by STRIPE_PRICE_HOTEL_*; the
 * nightly billing reconciler reports `price_drift` when they diverge.
 *
 * Launch offer: the first 50 hotels pay the Basic price (990 €) for their
 * first year regardless of package. Implemented as a Stripe coupon with
 * `duration: 'once'` per eligible package, so year two renews at list price.
 */

export type HotelPlan = 'accommodation' | 'basic' | 'professional' | 'advanced' | 'enterprise';

export const HOTEL_PLAN_ORDER: readonly HotelPlan[] = [
  'accommodation',
  'basic',
  'professional',
  'advanced',
  'enterprise',
];

export type HotelPlanPriceEnv =
  | 'STRIPE_PRICE_HOTEL_ACCOMMODATION'
  | 'STRIPE_PRICE_HOTEL_BASIC'
  | 'STRIPE_PRICE_HOTEL_PROFESSIONAL'
  | 'STRIPE_PRICE_HOTEL_ADVANCED'
  | 'STRIPE_PRICE_HOTEL_ENTERPRISE';

export interface HotelPlanDef {
  plan: HotelPlan;
  /** Yearly price in euro cents, VAT included. */
  cents: number;
  priceEnv: HotelPlanPriceEnv;
  /** Stripe price lookup key created by scripts/setup-stripe-products.ts. */
  lookupKey: string;
  /** Small independent units vs. hotels proper. */
  audience: 'hotel' | 'accommodation';
  /** Stripe coupon id applied during the launch offer (null = never discounted). */
  launchCouponId: string | null;
  name: { en: string; el: string };
  tagline: { en: string; el: string };
  features: Array<{ en: string; el: string }>;
  highlight?: boolean;
}

export const LAUNCH_OFFER_LIMIT = 50;
/** First-year price for launch-offer hotels (= Basic). */
export const LAUNCH_OFFER_CENTS = 99000;

export const HOTEL_PLANS: readonly HotelPlanDef[] = [
  {
    plan: 'accommodation',
    cents: 14900,
    priceEnv: 'STRIPE_PRICE_HOTEL_ACCOMMODATION',
    lookupKey: 'hotel_accommodation_yearly',
    audience: 'accommodation',
    launchCouponId: null,
    name: { en: 'Accommodation', el: 'Accommodation' },
    tagline: {
      en: 'For Airbnb, apartments, studios, villas and small independent units.',
      el: 'Για Airbnb, apartments, studios, villas και μικρές ανεξάρτητες μονάδες.',
    },
    features: [
      {
        en: 'Guest assistant with your house info, FAQs and local tips',
        el: 'Βοηθός επισκεπτών με τις πληροφορίες, FAQs και τοπικές προτάσεις σας',
      },
      {
        en: 'Embeddable widget and shareable guest link',
        el: 'Ενσωματώσιμο widget και σύνδεσμος για επισκέπτες',
      },
      {
        en: 'Owner dashboard for hours, amenities and policies',
        el: 'Πίνακας ιδιοκτήτη για ωράρια, παροχές και πολιτικές',
      },
      {
        en: 'Curated local directory for your guests',
        el: 'Επιμελημένος τοπικός κατάλογος για τους επισκέπτες σας',
      },
    ],
  },
  {
    plan: 'basic',
    cents: 99000,
    priceEnv: 'STRIPE_PRICE_HOTEL_BASIC',
    lookupKey: 'hotel_basic_yearly',
    audience: 'hotel',
    launchCouponId: null,
    name: { en: 'Basic Hotel', el: 'Basic Hotel' },
    tagline: { en: 'The essentials for every hotel.', el: 'Τα απαραίτητα για κάθε ξενοδοχείο.' },
    features: [
      {
        en: 'Guest assistant with your hotel knowledge (FAQs, amenities, hours, policies)',
        el: 'Βοηθός επισκεπτών με τη γνώση του ξενοδοχείου (FAQs, παροχές, ωράρια, πολιτικές)',
      },
      {
        en: 'Embeddable widget and QR guest link',
        el: 'Ενσωματώσιμο widget και QR σύνδεσμος επισκεπτών',
      },
      { en: 'Owner dashboard and team accounts', el: 'Πίνακας ιδιοκτήτη και λογαριασμοί ομάδας' },
      {
        en: 'Curated local directory for your guests',
        el: 'Επιμελημένος τοπικός κατάλογος για τους επισκέπτες σας',
      },
    ],
  },
  {
    plan: 'professional',
    cents: 149000,
    priceEnv: 'STRIPE_PRICE_HOTEL_PROFESSIONAL',
    lookupKey: 'hotel_professional_yearly',
    audience: 'hotel',
    launchCouponId: 'launch50_professional',
    highlight: true,
    name: { en: 'Professional Hotel', el: 'Professional Hotel' },
    tagline: { en: 'AI conversations in every language.', el: 'AI συνομιλίες σε κάθε γλώσσα.' },
    features: [
      { en: 'Everything in Basic', el: 'Όλα όσα έχει το Basic' },
      {
        en: 'AI assistant that answers in the guest’s own words and language',
        el: 'AI βοηθός που απαντά με τα λόγια και στη γλώσσα του επισκέπτη',
      },
      {
        en: 'Custom branding (logo and colours) on the widget',
        el: 'Custom branding (λογότυπο και χρώματα) στο widget',
      },
      {
        en: 'Knowledge base kept in sync automatically',
        el: 'Βάση γνώσης που ενημερώνεται αυτόματα',
      },
    ],
  },
  {
    plan: 'advanced',
    cents: 199000,
    priceEnv: 'STRIPE_PRICE_HOTEL_ADVANCED',
    lookupKey: 'hotel_advanced_yearly',
    audience: 'hotel',
    launchCouponId: 'launch50_advanced',
    name: { en: 'Advanced Hotel', el: 'Advanced Hotel' },
    tagline: { en: 'Turn recommendations into revenue.', el: 'Μετατρέψτε τις προτάσεις σε έσοδα.' },
    features: [
      { en: 'Everything in Professional', el: 'Όλα όσα έχει το Professional' },
      {
        en: 'Partner connections with local businesses and guest offers',
        el: 'Συνδέσεις με τοπικές επιχειρήσεις και προσφορές επισκεπτών',
      },
      {
        en: 'Referral and booking tracking with commissions',
        el: 'Παρακολούθηση παραπομπών και κρατήσεων με προμήθειες',
      },
      {
        en: 'Analytics on guest questions and click-throughs',
        el: 'Αναλυτικά στοιχεία για ερωτήσεις και clicks επισκεπτών',
      },
    ],
  },
  {
    plan: 'enterprise',
    cents: 299000,
    priceEnv: 'STRIPE_PRICE_HOTEL_ENTERPRISE',
    lookupKey: 'hotel_enterprise_yearly',
    audience: 'hotel',
    launchCouponId: 'launch50_enterprise',
    name: { en: 'Enterprise Hotel', el: 'Enterprise Hotel' },
    tagline: {
      en: 'For groups and multi-property brands.',
      el: 'Για ομίλους και brands με πολλά καταλύματα.',
    },
    features: [
      { en: 'Everything in Advanced', el: 'Όλα όσα έχει το Advanced' },
      { en: 'Multiple properties under one account', el: 'Πολλαπλά καταλύματα σε έναν λογαριασμό' },
      {
        en: 'Priority support and onboarding by the RoomRiv team',
        el: 'Προτεραιότητα υποστήριξης και onboarding από την ομάδα RoomRiv',
      },
      { en: 'Custom integrations on request', el: 'Custom integrations κατόπιν αιτήματος' },
    ],
  },
] as const;

export function hotelPlanFor(value: unknown): HotelPlanDef | null {
  return HOTEL_PLANS.find((p) => p.plan === value) ?? null;
}

export function isHotelPlan(value: unknown): value is HotelPlan {
  return typeof value === 'string' && (HOTEL_PLAN_ORDER as readonly string[]).includes(value);
}

/** Cents knocked off the first year by the launch offer (0 when not eligible). */
export function launchDiscountCents(plan: HotelPlan): number {
  const def = hotelPlanFor(plan);
  if (!def || def.audience !== 'hotel') return 0;
  return Math.max(0, def.cents - LAUNCH_OFFER_CENTS);
}

/** Only packages that actually get cheaper consume one of the 50 slots. */
export function isLaunchOfferEligible(plan: HotelPlan): boolean {
  return launchDiscountCents(plan) > 0;
}

export type HotelFeature =
  | 'llmChat'
  | 'partnerConnections'
  | 'analytics'
  | 'multiProperty'
  | 'prioritySupport';

export const HOTEL_FEATURES: readonly HotelFeature[] = [
  'llmChat',
  'partnerConnections',
  'analytics',
  'multiProperty',
  'prioritySupport',
];

/** `feature_flags.flag` name for each feature (per-hotel rows override the plan). */
export const HOTEL_FEATURE_FLAG: Record<HotelFeature, string> = {
  llmChat: 'llm_chat',
  partnerConnections: 'partner_connections',
  analytics: 'analytics',
  multiProperty: 'multi_property',
  prioritySupport: 'priority_support',
};

/** What each package includes by default. Higher packages include everything below. */
export function hotelPlanFeatures(plan: HotelPlan): Record<HotelFeature, boolean> {
  const rank = HOTEL_PLAN_ORDER.indexOf(plan);
  const atLeast = (p: HotelPlan) => rank >= HOTEL_PLAN_ORDER.indexOf(p);
  return {
    llmChat: atLeast('professional'),
    partnerConnections: atLeast('advanced'),
    analytics: atLeast('advanced'),
    multiProperty: atLeast('enterprise'),
    prioritySupport: atLeast('enterprise'),
  };
}

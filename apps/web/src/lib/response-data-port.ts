import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import type { ResponseDataPort } from '@aga/response-engine';
import { DEFAULT_RULES, type RecommendationRules } from '@aga/response-engine';
import type { RecommendationCard } from '@aga/api-contracts';
import { signReferral } from '@aga/db/referral-token';
import { keywordMatchScore, haversineKm, isOpenNow } from './recommendation-signals';

type DB = SupabaseClient<Database>;

interface RequestCtx {
  sessionId: string;
  appOrigin: string;
  hmacSecret: string;
  /** Hotel's own coordinates, when known — enables real proximity ranking/display. */
  hotelLocation?: { lat: number; lng: number };
}

/**
 * Concrete adapter wiring RuleBasedProvider to Supabase. Called per-request
 * with a service-role client and the guest's session context. Sanitizes
 * commission/priority out of guest-facing payloads.
 */
export function buildDataPort(supabase: DB, ctx: RequestCtx): ResponseDataPort {
  return {
    async resolveAskFacts({ hotelId, intent, locale }) {
      switch (intent) {
        case 'ask_checkin':
        case 'ask_checkout':
        case 'ask_breakfast': {
          const entity = intent === 'ask_checkin'
            ? 'checkin'
            : intent === 'ask_checkout'
              ? 'checkout'
              : 'breakfast';
          const today = new Date();
          const weekday = today.getDay();
          const { data } = await supabase
            .from('hours')
            .select('opens, closes')
            .eq('hotel_id', hotelId)
            .eq('entity_type', entity)
            .eq('weekday', weekday)
            .maybeSingle();
          if (!data) return null;
          if (intent === 'ask_breakfast') {
            return { opens: trimSeconds(data.opens), closes: trimSeconds(data.closes) };
          }
          return { time: trimSeconds(intent === 'ask_checkin' ? data.opens : data.closes) };
        }
        case 'ask_wifi': {
          const { data } = await supabase
            .from('faqs')
            .select('id, answer')
            .eq('hotel_id', hotelId)
            .eq('intent_slug', 'ask_wifi')
            .eq('locale', locale)
            .eq('state', 'published')
            .limit(1)
            .maybeSingle();
          if (!data) return null;
          return { id: data.id, ssid: 'AegeanBlue', password: data.answer };
        }
        case 'ask_amenity_hours':
        case 'ask_policy':
        case 'ask_room_info': {
          const { data } = await supabase
            .from('faqs')
            .select('id, answer')
            .eq('hotel_id', hotelId)
            .eq('intent_slug', intent)
            .eq('locale', locale)
            .eq('state', 'published')
            .limit(1)
            .maybeSingle();
          if (!data) return null;
          return { id: data.id, body: data.answer };
        }
        default:
          return null;
      }
    },

    async searchRecommendationCandidates({ hotelId, intent, locale, text, guestLocalTime }) {
      const categorySlug = INTENT_TO_CATEGORY[intent];
      if (!categorySlug) return { candidates: [], cardFor: async () => null };

      // Pull candidates with optional partnership join for this hotel.
      const { data } = await supabase
        .from('businesses')
        .select(
          `
            id, name, lat, lng, website, phone,
            description_i18n,
            opening_hours_json,
            tags,
            images,
            price_band,
            category:business_categories!inner ( slug ),
            partnerships ( id, hotel_id, subscription_tier, paid_priority_score, commission_pct, active )
          `,
        )
        .eq('active', true)
        .eq('verified', true)
        .eq('business_categories.slug', categorySlug)
        .limit(50);

      const rows = (data ?? []) as unknown as Array<{
        id: string;
        name: string;
        lat: number;
        lng: number;
        website: string | null;
        phone: string | null;
        description_i18n: Record<string, string>;
        opening_hours_json: unknown;
        tags: string[];
        price_band: number | null;
        category: { slug: string };
        partnerships: Array<{
          id: string;
          hotel_id: string;
          subscription_tier: 'free' | 'standard' | 'featured' | 'exclusive';
          paid_priority_score: number;
          commission_pct: number;
          active: boolean;
        }>;
      }>;

      // Real relevance signals per candidate (see recommendation-signals.ts).
      // `openNow` here feeds the ranking engine, whose RankingCandidate.openNow
      // is a strict boolean (no "unknown" state) — see cardFor below for the
      // guest-facing nullable value. When hours are unknown we pass `true`:
      // that reproduces this data port's previous behavior (which hardcoded
      // `openNow: true` for every candidate, since no hotel had hours data),
      // so today's ranking doesn't regress for businesses that still lack
      // opening_hours_json. It is *not* neutral in scoreOne's math (timeMatch
      // is 1.0 when true vs 0.3 when false — there's no third, neutral value
      // in a boolean field), but it is the least-surprising choice: an unknown
      // schedule is treated as "no evidence it's closed" rather than penalized.
      const computeSignals = (b: (typeof rows)[number]) => {
        const keywordMatch = keywordMatchScore(text, {
          name: b.name,
          tags: b.tags,
          description: b.description_i18n?.[locale] ?? null,
        });
        const distanceKm = ctx.hotelLocation ? haversineKm(ctx.hotelLocation, { lat: b.lat, lng: b.lng }) : 1.0;
        const isOpen = isOpenNow(b.opening_hours_json, guestLocalTime);
        return { keywordMatch, distanceKm, isOpen };
      };

      const candidates = rows.map((b) => {
        const ours = b.partnerships.find((p) => p.hotel_id === hotelId && p.active) ?? null;
        const { keywordMatch, distanceKm, isOpen } = computeSignals(b);
        return {
          businessId: b.id,
          keywordMatch,
          distanceKm,
          openNow: isOpen ?? true,
          categoryFit: true,
          preferenceMatch: 0,
          partnership: ours
            ? {
                subscriptionTier: ours.subscription_tier,
                paidPriorityScore: ours.paid_priority_score,
                commissionPct: ours.commission_pct,
              }
            : null,
        };
      });

      const byId = new Map(rows.map((r) => [r.id, r]));

      return {
        candidates,
        async cardFor(id: string): Promise<RecommendationCard | null> {
          const b = byId.get(id);
          if (!b) return null;
          const partnership = b.partnerships.find((p) => p.hotel_id === hotelId && p.active) ?? null;
          // Guest-facing card: unlike the ranking candidate above, an unknown
          // distance/openNow status is surfaced as null rather than a neutral
          // stub — we never want to show a fabricated distance or "open" badge.
          const distanceKm = ctx.hotelLocation ? haversineKm(ctx.hotelLocation, { lat: b.lat, lng: b.lng }) : null;
          const isOpen = isOpenNow(b.opening_hours_json, guestLocalTime);

          let referralUrl: string;
          if (partnership) {
            // Insert a referral row and sign a token that points back at our redirect.
            const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
            const { data: created, error } = await supabase
              .from('referrals')
              .insert({
                session_id: ctx.sessionId,
                partnership_id: partnership.id,
                expires_at: expiresAt.toISOString(),
              })
              .select('id')
              .single();
            if (error || !created) {
              referralUrl = b.website ?? `${ctx.appOrigin}/`;
            } else {
              const expSec = Math.floor(expiresAt.getTime() / 1000);
              const token = signReferral(created.id, expSec, ctx.hmacSecret);
              referralUrl = `${ctx.appOrigin}/api/r/${token}`;
            }
          } else {
            // Non-partner: send straight to the business's own website (no commission tracked)
            referralUrl = b.website ?? `${ctx.appOrigin}/`;
          }

          return {
            businessId: b.id,
            name: b.name,
            category: b.category.slug,
            description: b.description_i18n.en ?? b.description_i18n.el ?? null,
            distanceKm,
            openNow: isOpen,
            priceBand: b.price_band,
            imageUrl: null,
            promoted: partnership !== null && partnership.subscription_tier !== 'free',
            referralUrl,
          };
        },
      };
    },

    async getRules(hotelId): Promise<RecommendationRules> {
      const { data } = await supabase
        .from('recommendation_rules')
        .select('*')
        .or(`hotel_id.eq.${hotelId},hotel_id.is.null`)
        .order('hotel_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (!data) return DEFAULT_RULES;
      return {
        semanticWeight: Number(data.semantic_weight),
        proximityWeight: Number(data.proximity_weight),
        timeMatchWeight: Number(data.time_match_weight),
        categoryWeight: Number(data.category_weight),
        preferenceWeight: Number(data.preference_weight),
        partnerBiasWeight: Number(data.partner_bias_weight),
        distancePenaltyPerKm: Number(data.distance_penalty_per_km),
        proximityScaleKm: Number(data.proximity_scale_km),
        tierMultipliers: data.tier_multipliers as RecommendationRules['tierMultipliers'],
        maxResults: data.max_results,
      };
    },

    async notifyStaff({ hotelId, sessionId }) {
      // Mark the session for staff follow-up. Real notification (email/SMS)
      // ships in week 10 with the partner-webhook.
      await supabase
        .from('guest_sessions')
        .update({ meta_json: { needs_staff: true, hotel_id: hotelId } })
        .eq('id', sessionId);
    },
  };
}

const INTENT_TO_CATEGORY: Record<string, string> = {
  recommend_restaurant: 'restaurants',
  recommend_bar: 'bars-cafes',
  recommend_activity: 'activities',
  recommend_taxi: 'taxis',
  recommend_shop: 'shops',
  recommend_event: 'events',
};

function trimSeconds(t: string): string {
  return t.length > 5 ? t.slice(0, 5) : t;
}

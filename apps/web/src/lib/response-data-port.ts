import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aga/db/types';
import type { ResponseDataPort } from '@aga/response-engine';
import { DEFAULT_RULES, type RecommendationRules } from '@aga/response-engine';
import type { RecommendationCard } from '@aga/api-contracts';

type DB = SupabaseClient<Database>;

/**
 * Concrete adapter wiring RuleBasedProvider to Supabase. The Edge Function /
 * API route calls this with a service-role client (RLS bypassed) and is
 * responsible for sanitizing what is returned to guests — never expose
 * commission_pct or paid_priority_score in the response payload.
 */
export function buildDataPort(supabase: DB): ResponseDataPort {
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

    async searchRecommendationCandidates({ hotelId, intent }) {
      const categorySlug = INTENT_TO_CATEGORY[intent];
      if (!categorySlug) return { candidates: [], cardFor: async () => null };

      // Pull candidates with optional partnership join for this hotel.
      const { data } = await supabase
        .from('businesses')
        .select(
          `
            id, name, lat, lng,
            description_i18n,
            opening_hours_json,
            images,
            price_band,
            category:business_categories!inner ( slug ),
            partnerships ( hotel_id, subscription_tier, paid_priority_score, commission_pct, active )
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
        description_i18n: Record<string, string>;
        price_band: number | null;
        category: { slug: string };
        partnerships: Array<{
          hotel_id: string;
          subscription_tier: 'free' | 'standard' | 'featured' | 'exclusive';
          paid_priority_score: number;
          commission_pct: number;
          active: boolean;
        }>;
      }>;

      const candidates = rows.map((b) => {
        const ours = b.partnerships.find((p) => p.hotel_id === hotelId && p.active) ?? null;
        return {
          businessId: b.id,
          keywordMatch: 0.5,
          distanceKm: 1.0,
          openNow: true,
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
          // Create a referral row to get a signed URL.
          // (For now, synthesize a placeholder URL — wired up properly once the
          // referral-redirect Edge Function lands in week 10.)
          const referralUrl = new URL(`/api/r/pending`, 'http://localhost').toString();
          return {
            businessId: b.id,
            name: b.name,
            category: b.category.slug,
            description: b.description_i18n.en ?? b.description_i18n.el ?? null,
            distanceKm: null,
            openNow: null,
            priceBand: b.price_band,
            imageUrl: null,
            promoted:
              partnership !== null && partnership.subscription_tier !== 'free',
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

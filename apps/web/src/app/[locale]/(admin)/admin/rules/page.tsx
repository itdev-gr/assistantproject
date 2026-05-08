import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { RulesEditor } from '@/components/admin/RulesEditor';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ hotel?: string }>;
}

const FALLBACK = {
  hotelId: null,
  semanticWeight: 1.0,
  proximityWeight: 1.5,
  timeMatchWeight: 1.0,
  categoryWeight: 0.8,
  preferenceWeight: 0.5,
  partnerBiasWeight: 0.5,
  distancePenaltyPerKm: 0.05,
  tierMultipliers: { free: 1.0, standard: 1.15, featured: 1.4, exclusive: 1.7 },
  maxResults: 5,
};

export default async function RulesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const hotelId = sp.hotel ?? null;

  const [{ data: hotels }, { data: rule }] = await Promise.all([
    supabase.from('hotels').select('id, name').order('name'),
    supabase
      .from('recommendation_rules')
      .select('*')
      .eq(hotelId ? 'hotel_id' : 'hotel_id', hotelId ?? null)
      .is(hotelId ? '__skip' : 'hotel_id', null)
      .maybeSingle()
      .then(async (res) => {
        if (res.data) return res;
        // Fall back to global row if per-hotel row missing
        return supabase.from('recommendation_rules').select('*').is('hotel_id', null).maybeSingle();
      }),
  ]);

  const initial = rule
    ? {
        hotelId,
        semanticWeight: Number(rule.semantic_weight),
        proximityWeight: Number(rule.proximity_weight),
        timeMatchWeight: Number(rule.time_match_weight),
        categoryWeight: Number(rule.category_weight),
        preferenceWeight: Number(rule.preference_weight),
        partnerBiasWeight: Number(rule.partner_bias_weight),
        distancePenaltyPerKm: Number(rule.distance_penalty_per_km),
        tierMultipliers: rule.tier_multipliers as typeof FALLBACK.tierMultipliers,
        maxResults: rule.max_results,
      }
    : FALLBACK;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {locale === 'en' ? 'Recommendation rules' : 'Κανόνες προτάσεων'}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {locale === 'en'
              ? 'Tweak the ranking. Partner bias is multiplicative on a relevance-driven base — irrelevant featured partners cannot beat a relevant non-partner.'
              : 'Ρυθμίστε το ranking. Το partner bias είναι πολλαπλασιαστικό σε σχέση με τη βασική συνάφεια — μη συναφείς συνεργάτες δεν μπορούν να ξεπεράσουν μια σχετική επιλογή χωρίς συνεργασία.'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RulesEditor
            locale={locale}
            hotels={hotels ?? []}
            initial={initial}
            currentHotelId={hotelId}
          />
        </CardContent>
      </Card>
    </div>
  );
}

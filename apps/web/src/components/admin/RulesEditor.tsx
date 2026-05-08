'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import type { RecommendationRulesUpsert, SubscriptionTier } from '@aga/api-contracts';
import { Button, Input, Label } from '@aga/ui';
import { upsertRules } from '@/app/actions/admin-rules';

interface Props {
  locale: string;
  hotels: { id: string; name: string }[];
  currentHotelId: string | null;
  initial: RecommendationRulesUpsert;
}

const TIERS: SubscriptionTier[] = ['free', 'standard', 'featured', 'exclusive'];

export function RulesEditor({ locale, hotels, currentHotelId, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<RecommendationRulesUpsert>(initial);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    start(async () => {
      const r = await upsertRules(v);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          {locale === 'en' ? 'Scope' : 'Πεδίο'}
        </Label>
        <select
          value={currentHotelId ?? ''}
          onChange={(e) => router.push(e.target.value ? `/admin/rules?hotel=${e.target.value}` : '/admin/rules')}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{locale === 'en' ? 'Global default' : 'Καθολική προεπιλογή'}</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Slider
          label={locale === 'en' ? 'Keyword match weight' : 'Βάρος keyword'}
          value={v.semanticWeight}
          onChange={(n) => setV({ ...v, semanticWeight: n })}
        />
        <Slider
          label={locale === 'en' ? 'Proximity weight' : 'Βάρος εγγύτητας'}
          value={v.proximityWeight}
          onChange={(n) => setV({ ...v, proximityWeight: n })}
        />
        <Slider
          label={locale === 'en' ? 'Time match weight' : 'Βάρος ωραρίου'}
          value={v.timeMatchWeight}
          onChange={(n) => setV({ ...v, timeMatchWeight: n })}
        />
        <Slider
          label={locale === 'en' ? 'Category fit weight' : 'Βάρος κατηγορίας'}
          value={v.categoryWeight}
          onChange={(n) => setV({ ...v, categoryWeight: n })}
        />
        <Slider
          label={locale === 'en' ? 'Preference match' : 'Συμφωνία προτιμήσεων'}
          value={v.preferenceWeight}
          onChange={(n) => setV({ ...v, preferenceWeight: n })}
        />
        <Slider
          label={locale === 'en' ? 'Partner bias' : 'Bias συνεργατών'}
          value={v.partnerBiasWeight}
          onChange={(n) => setV({ ...v, partnerBiasWeight: n })}
        />
        <Slider
          label={locale === 'en' ? 'Distance penalty / km' : 'Ποινή απόστασης / χλμ'}
          value={v.distancePenaltyPerKm}
          onChange={(n) => setV({ ...v, distancePenaltyPerKm: n })}
          max={1}
          step={0.01}
        />
        <div className="space-y-1.5">
          <Label>{locale === 'en' ? 'Max results' : 'Μέγιστα αποτελέσματα'}</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={v.maxResults}
            onChange={(e) => setV({ ...v, maxResults: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          {locale === 'en' ? 'Tier multipliers' : 'Πολλαπλασιαστές tier'}
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          {TIERS.map((t) => (
            <div key={t} className="space-y-1.5">
              <Label className="text-xs">{t}</Label>
              <Input
                type="number"
                step="0.05"
                min={0.5}
                max={3}
                value={v.tierMultipliers[t]}
                onChange={(e) =>
                  setV({
                    ...v,
                    tierMultipliers: { ...v.tierMultipliers, [t]: Number(e.target.value) },
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {locale === 'en' ? 'Save' : 'Αποθήκευση'}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  max = 5,
  step = 0.05,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

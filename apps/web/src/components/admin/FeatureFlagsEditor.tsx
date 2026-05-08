'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input } from '@aga/ui';
import { setFeatureFlag } from '@/app/actions/admin-rules';

interface Row {
  id: string;
  hotelId: string | null;
  flag: string;
  enabled: boolean;
}

interface Props {
  locale: string;
  hotels: { id: string; name: string }[];
  rows: Row[];
}

export function FeatureFlagsEditor({ locale, hotels, rows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draftFlag, setDraftFlag] = useState('');
  const [draftHotel, setDraftHotel] = useState<string>('');
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!draftFlag.trim()) return;
    setError(null);
    start(async () => {
      const r = await setFeatureFlag({
        flag: draftFlag.trim(),
        hotelId: draftHotel || null,
        enabled: draftEnabled,
      });
      if (r.ok) {
        setDraftFlag('');
        setDraftHotel('');
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function toggle(row: Row) {
    start(async () => {
      await setFeatureFlag({
        flag: row.flag,
        hotelId: row.hotelId,
        enabled: !row.enabled,
      });
      router.refresh();
    });
  }

  function hotelLabel(id: string | null): string {
    if (!id) return locale === 'en' ? 'Global' : 'Καθολικό';
    return hotels.find((h) => h.id === id)?.name ?? id.slice(0, 8);
  }

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">Flag</th>
            <th className="py-2">{locale === 'en' ? 'Scope' : 'Πεδίο'}</th>
            <th className="py-2">{locale === 'en' ? 'Enabled' : 'Ενεργό'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2 font-mono text-xs">{r.flag}</td>
              <td className="py-2">{hotelLabel(r.hotelId)}</td>
              <td className="py-2">
                <button
                  onClick={() => toggle(r)}
                  disabled={pending}
                  className="text-xs underline"
                >
                  {r.enabled ? (locale === 'en' ? 'on' : 'ON') : locale === 'en' ? 'off' : 'OFF'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">
          {locale === 'en' ? 'Set flag' : 'Ορισμός flag'}
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="flag.name"
            value={draftFlag}
            onChange={(e) => setDraftFlag(e.target.value)}
          />
          <select
            value={draftHotel}
            onChange={(e) => setDraftHotel(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{locale === 'en' ? 'Global' : 'Καθολικό'}</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draftEnabled}
              onChange={(e) => setDraftEnabled(e.target.checked)}
            />
            {locale === 'en' ? 'Enabled' : 'Ενεργό'}
          </label>
          <Button onClick={add} disabled={pending || !draftFlag.trim()}>
            {locale === 'en' ? 'Save' : 'Αποθήκευση'}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

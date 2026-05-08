'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import type { HoursRow } from '@aga/api-contracts';
import { Button, Input } from '@aga/ui';
import { upsertHours, deleteHours } from '@/app/actions/owner-hours';

const ENTITIES = [
  'reception',
  'breakfast',
  'lunch',
  'dinner',
  'pool',
  'bar',
  'spa',
  'gym',
  'checkin',
  'checkout',
  'amenity',
] as const;

interface Props {
  locale: string;
  weekdays: string[];
  rows: HoursRow[];
}

export function HoursTable({ locale, weekdays, rows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<HoursRow>({
    entityType: 'breakfast',
    entityRef: null,
    weekday: 1,
    opens: '07:30',
    closes: '10:30',
    seasonalStart: null,
    seasonalEnd: null,
  });

  function add() {
    start(async () => {
      const r = await upsertHours(draft);
      if (r.ok) router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteHours({ id });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">{locale === 'en' ? 'Entity' : 'Κατηγορία'}</th>
            <th className="py-2">{locale === 'en' ? 'Day' : 'Ημέρα'}</th>
            <th className="py-2">{locale === 'en' ? 'Opens' : 'Ανοίγει'}</th>
            <th className="py-2">{locale === 'en' ? 'Closes' : 'Κλείνει'}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2 font-medium">{r.entityType}</td>
              <td className="py-2">{weekdays[r.weekday]}</td>
              <td className="py-2">{r.opens.slice(0, 5)}</td>
              <td className="py-2">{r.closes.slice(0, 5)}</td>
              <td className="py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => r.id && remove(r.id)}
                  disabled={pending}
                >
                  {locale === 'en' ? 'Delete' : 'Διαγραφή'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">
          {locale === 'en' ? 'Add a new row' : 'Προσθήκη νέας γραμμής'}
        </p>
        <div className="grid gap-3 md:grid-cols-5">
          <select
            value={draft.entityType}
            onChange={(e) => setDraft({ ...draft, entityType: e.target.value as HoursRow['entityType'] })}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <select
            value={draft.weekday}
            onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {weekdays.map((w, i) => (
              <option key={i} value={i}>
                {w}
              </option>
            ))}
          </select>
          <Input
            type="time"
            value={draft.opens}
            onChange={(e) => setDraft({ ...draft, opens: e.target.value })}
          />
          <Input
            type="time"
            value={draft.closes}
            onChange={(e) => setDraft({ ...draft, closes: e.target.value })}
          />
          <Button onClick={add} disabled={pending}>
            {locale === 'en' ? 'Add' : 'Προσθήκη'}
          </Button>
        </div>
      </div>
    </div>
  );
}

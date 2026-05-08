'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import type { RoomUpsert } from '@aga/api-contracts';
import { Button, Input } from '@aga/ui';
import { upsertRoom, deleteRoom } from '@/app/actions/owner-rooms';

interface Props {
  locale: string;
  hotelSlug: string;
  rows: (RoomUpsert & { id: string })[];
}

export function RoomsEditor({ locale, hotelSlug, rows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<RoomUpsert>({
    code: '',
    floor: null,
    view: null,
    notes: null,
  });

  function add() {
    if (!draft.code.trim()) return;
    start(async () => {
      const r = await upsertRoom(draft);
      if (r.ok) {
        setDraft({ code: '', floor: null, view: null, notes: null });
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteRoom({ id });
      router.refresh();
    });
  }

  function qrUrl(code: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/${locale}/h/${hotelSlug}?room=${encodeURIComponent(code)}`;
  }

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">{locale === 'en' ? 'Code' : 'Κωδικός'}</th>
            <th className="py-2">{locale === 'en' ? 'Floor' : 'Όροφος'}</th>
            <th className="py-2">{locale === 'en' ? 'View' : 'Θέα'}</th>
            <th className="py-2">QR URL</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2 font-medium">{r.code}</td>
              <td className="py-2">{r.floor ?? '—'}</td>
              <td className="py-2">{r.view ?? '—'}</td>
              <td className="py-2 font-mono text-xs">
                <a className="underline" href={qrUrl(r.code)} target="_blank" rel="noreferrer">
                  {locale === 'en' ? 'open' : 'άνοιγμα'}
                </a>
              </td>
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
          {locale === 'en' ? 'Add room' : 'Προσθήκη δωματίου'}
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder={locale === 'en' ? 'Code' : 'Κωδικός'}
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
          />
          <Input
            type="number"
            placeholder={locale === 'en' ? 'Floor' : 'Όροφος'}
            value={draft.floor ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                floor: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
          <Input
            placeholder={locale === 'en' ? 'View (sea, garden…)' : 'Θέα (θάλασσα, κήπος…)'}
            value={draft.view ?? ''}
            onChange={(e) => setDraft({ ...draft, view: e.target.value || null })}
          />
          <Button onClick={add} disabled={pending || !draft.code.trim()}>
            {locale === 'en' ? 'Add' : 'Προσθήκη'}
          </Button>
        </div>
      </div>
    </div>
  );
}

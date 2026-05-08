'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import type { PolicyUpsert } from '@aga/api-contracts';
import { Button, Textarea, Label } from '@aga/ui';
import { upsertPolicy, deletePolicy } from '@/app/actions/owner-policies';

const KINDS: PolicyUpsert['kind'][] = ['pets', 'smoking', 'cancellation', 'payment', 'noise'];

interface Props {
  locale: string;
  rows: (PolicyUpsert & { id: string })[];
}

export function PoliciesEditor({ locale, rows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draftKind, setDraftKind] = useState<PolicyUpsert['kind']>('pets');
  const [draftLocale, setDraftLocale] = useState<'el' | 'en'>(locale === 'en' ? 'en' : 'el');
  const [draftBody, setDraftBody] = useState('');

  function add() {
    if (!draftBody.trim()) return;
    start(async () => {
      const r = await upsertPolicy({
        kind: draftKind,
        body: draftBody.trim(),
        locale: draftLocale,
      });
      if (r.ok) {
        setDraftBody('');
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      await deletePolicy({ id });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-medium">
                {r.kind} · <span className="text-xs uppercase">{r.locale}</span>
              </p>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)} disabled={pending}>
                {locale === 'en' ? 'Delete' : 'Διαγραφή'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.body}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-medium">
          {locale === 'en' ? 'Add policy' : 'Προσθήκη πολιτικής'}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="kind">{locale === 'en' ? 'Kind' : 'Είδος'}</Label>
            <select
              id="kind"
              value={draftKind}
              onChange={(e) => setDraftKind(e.target.value as PolicyUpsert['kind'])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locale">{locale === 'en' ? 'Language' : 'Γλώσσα'}</Label>
            <select
              id="locale"
              value={draftLocale}
              onChange={(e) => setDraftLocale(e.target.value as 'el' | 'en')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="el">Ελληνικά</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="body">{locale === 'en' ? 'Body' : 'Κείμενο'}</Label>
          <Textarea
            id="body"
            rows={4}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
          />
        </div>
        <Button onClick={add} disabled={pending || !draftBody.trim()}>
          {locale === 'en' ? 'Save' : 'Αποθήκευση'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input } from '@aga/ui';
import { upsertCategory, deleteCategory } from '@/app/actions/admin-businesses';

interface Row {
  id: string;
  slug: string;
  nameI18n: Record<string, string>;
  parentId: string | null;
}

interface Props {
  locale: string;
  rows: Row[];
}

export function CategoriesEditor({ locale, rows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [slug, setSlug] = useState('');
  const [nameEl, setNameEl] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!slug.trim()) return;
    setError(null);
    start(async () => {
      const r = await upsertCategory({
        slug: slug.trim(),
        nameI18n: { el: nameEl.trim(), en: nameEn.trim() },
        parentId: parentId || null,
      });
      if (r.ok) {
        setSlug('');
        setNameEl('');
        setNameEn('');
        setParentId('');
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function remove(id: string) {
    if (!confirm(locale === 'en' ? 'Delete?' : 'Διαγραφή;')) return;
    start(async () => {
      await deleteCategory({ id });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{c.slug}</span>
            <span className="flex-1">
              {c.nameI18n[locale] ?? c.nameI18n.en ?? c.nameI18n.el ?? c.slug}
            </span>
            <Button variant="ghost" size="sm" onClick={() => remove(c.id)} disabled={pending}>
              {locale === 'en' ? 'Delete' : 'Διαγραφή'}
            </Button>
          </li>
        ))}
      </ul>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">
          {locale === 'en' ? 'Add category' : 'Προσθήκη κατηγορίας'}
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input
            placeholder="Όνομα (el)"
            value={nameEl}
            onChange={(e) => setNameEl(e.target.value)}
          />
          <Input
            placeholder="Name (en)"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{locale === 'en' ? '(top-level)' : '(κορυφαίο επίπεδο)'}</option>
            {rows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={add} disabled={pending || !slug.trim()}>
            {locale === 'en' ? 'Add' : 'Προσθήκη'}
          </Button>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </div>
    </div>
  );
}

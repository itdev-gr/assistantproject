'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input } from '@aga/ui';
import { upsertCategory, deleteCategory } from '@/app/actions/admin-businesses';
import { dashSelect } from '@/components/dashboard/field-classes';

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

interface Draft {
  slug: string;
  nameEl: string;
  nameEn: string;
  parentId: string;
}

const emptyDraft: Draft = { slug: '', nameEl: '', nameEn: '', parentId: '' };

function draftFromRow(row: Row): Draft {
  return {
    slug: row.slug,
    nameEl: row.nameI18n.el ?? '',
    nameEn: row.nameI18n.en ?? '',
    parentId: row.parentId ?? '',
  };
}

/** The row itself plus every category below it — none of these may become its parent. */
function descendantIds(rows: Row[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (r.parentId && out.has(r.parentId) && !out.has(r.id)) {
        out.add(r.id);
        grew = true;
      }
    }
  }
  return out;
}

interface FieldsProps {
  locale: string;
  rows: Row[];
  excludeIds?: Set<string>;
  value: Draft;
  onChange: (next: Draft) => void;
  disabled?: boolean;
}

function CategoryFields({ locale, rows, excludeIds, value, onChange, disabled }: FieldsProps) {
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Input
        placeholder="slug"
        value={value.slug}
        onChange={(e) => set({ slug: e.target.value })}
        disabled={disabled}
      />
      <Input
        placeholder="Όνομα (el)"
        value={value.nameEl}
        onChange={(e) => set({ nameEl: e.target.value })}
        disabled={disabled}
      />
      <Input
        placeholder="Name (en)"
        value={value.nameEn}
        onChange={(e) => set({ nameEn: e.target.value })}
        disabled={disabled}
      />
      <select
        value={value.parentId}
        onChange={(e) => set({ parentId: e.target.value })}
        disabled={disabled}
        aria-label={locale === 'en' ? 'Parent' : 'Γονική'}
        className={dashSelect}
      >
        <option value="">{locale === 'en' ? '(top-level)' : '(κορυφαίο επίπεδο)'}</option>
        {rows
          .filter((c) => !excludeIds?.has(c.id))
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.slug}
            </option>
          ))}
      </select>
    </div>
  );
}

export function CategoriesEditor({ locale, rows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(emptyDraft);
  const [editError, setEditError] = useState<string | null>(null);

  const slugById = new Map(rows.map((c) => [c.id, c.slug]));

  function add() {
    if (!draft.slug.trim()) return;
    setError(null);
    start(async () => {
      const r = await upsertCategory({
        slug: draft.slug.trim(),
        nameI18n: { el: draft.nameEl.trim(), en: draft.nameEn.trim() },
        parentId: draft.parentId || null,
      });
      if (r.ok) {
        setDraft(emptyDraft);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function beginEdit(row: Row) {
    setEditError(null);
    setEdit(draftFromRow(row));
    setEditingId(row.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  function save(id: string) {
    if (!edit.slug.trim()) return;
    setEditError(null);
    start(async () => {
      const r = await upsertCategory({
        id,
        slug: edit.slug.trim(),
        nameI18n: { el: edit.nameEl.trim(), en: edit.nameEn.trim() },
        parentId: edit.parentId || null,
      });
      if (r.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        setEditError(r.error);
      }
    });
  }

  function remove(id: string) {
    if (!confirm(t('Delete?', 'Διαγραφή;'))) return;
    start(async () => {
      await deleteCategory({ id });
      router.refresh();
    });
  }

  const rowActionsDisabled = pending || editingId !== null;

  return (
    <div className="space-y-4">
      <ul className="divide-y">
        {rows.map((c) =>
          c.id === editingId ? (
            <li key={c.id} className="space-y-3 py-3">
              <CategoryFields
                locale={locale}
                rows={rows}
                excludeIds={descendantIds(rows, c.id)}
                value={edit}
                onChange={setEdit}
                disabled={pending}
              />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={() => save(c.id)} disabled={pending || !edit.slug.trim()}>
                  {t('Save', 'Αποθήκευση')}
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={pending}>
                  {t('Cancel', 'Άκυρο')}
                </Button>
                {editError && <span className="text-sm text-destructive">{editError}</span>}
              </div>
            </li>
          ) : (
            <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{c.slug}</span>
              <span className="flex-1">
                {c.nameI18n[locale] ?? c.nameI18n.en ?? c.nameI18n.el ?? c.slug}
                {c.parentId && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ↳ {slugById.get(c.parentId) ?? c.parentId}
                  </span>
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => beginEdit(c)}
                disabled={rowActionsDisabled}
              >
                {t('Edit', 'Επεξεργασία')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(c.id)}
                disabled={rowActionsDisabled}
              >
                {t('Delete', 'Διαγραφή')}
              </Button>
            </li>
          ),
        )}
      </ul>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">{t('Add category', 'Προσθήκη κατηγορίας')}</p>
        <CategoryFields
          locale={locale}
          rows={rows}
          value={draft}
          onChange={setDraft}
          disabled={pending}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={add} disabled={pending || !draft.slug.trim()}>
            {t('Add', 'Προσθήκη')}
          </Button>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </div>
    </div>
  );
}

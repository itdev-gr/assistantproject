'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import type { SubscriptionTier } from '@aga/api-contracts';
import { Button, Input, Badge } from '@aga/ui';
import { upsertPartnership, deletePartnership } from '@/app/actions/admin-partnerships';
import { PartnershipBillingPanel } from './PartnershipBillingPanel';

interface Row {
  id: string;
  hotelId: string;
  hotelName: string;
  businessId: string;
  businessName: string;
  billingEmail: string | null;
  commissionPct: number;
  paidPriorityScore: number;
  subscriptionTier: SubscriptionTier;
  billingStatus: string;
  active: boolean;
  contractStarts: string | null;
  contractEnds: string | null;
}

interface Props {
  locale: string;
  hotels: { id: string; name: string; slug: string }[];
  businesses: { id: string; name: string }[];
  rows: Row[];
}

const TIERS: SubscriptionTier[] = ['free', 'standard', 'featured', 'exclusive'];

export function PartnershipsEditor({ locale, hotels, businesses, rows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState({
    hotelId: hotels[0]?.id ?? '',
    businessId: businesses[0]?.id ?? '',
    commissionPct: 10,
    paidPriorityScore: 50,
    subscriptionTier: 'standard' as SubscriptionTier,
    active: true,
  });
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    start(async () => {
      const r = await upsertPartnership({
        hotelId: draft.hotelId,
        businessId: draft.businessId,
        commissionPct: draft.commissionPct,
        paidPriorityScore: draft.paidPriorityScore,
        subscriptionTier: draft.subscriptionTier,
        contractStarts: null,
        contractEnds: null,
        active: draft.active,
        notes: null,
      });
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  function toggleActive(row: Row) {
    start(async () => {
      await upsertPartnership({
        id: row.id,
        hotelId: row.hotelId,
        businessId: row.businessId,
        commissionPct: row.commissionPct,
        paidPriorityScore: row.paidPriorityScore,
        subscriptionTier: row.subscriptionTier,
        contractStarts: row.contractStarts,
        contractEnds: row.contractEnds,
        active: !row.active,
        notes: null,
      });
      router.refresh();
    });
  }

  function setTier(row: Row, tier: SubscriptionTier) {
    start(async () => {
      await upsertPartnership({
        id: row.id,
        hotelId: row.hotelId,
        businessId: row.businessId,
        commissionPct: row.commissionPct,
        paidPriorityScore: row.paidPriorityScore,
        subscriptionTier: tier,
        contractStarts: row.contractStarts,
        contractEnds: row.contractEnds,
        active: row.active,
        notes: null,
      });
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm(locale === 'en' ? 'Delete?' : 'Διαγραφή;')) return;
    start(async () => {
      await deletePartnership({ id });
      router.refresh();
    });
  }

  const missing: string[] = [];
  if (hotels.length === 0) missing.push(locale === 'en' ? 'a hotel' : 'ένα κατάλυμα');
  if (businesses.length === 0) missing.push(locale === 'en' ? 'a business' : 'μια επιχείρηση');

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm">
          <p className="mb-2 font-medium">
            {locale === 'en' ? 'Set up the prerequisites first:' : 'Πρώτα οριστε τα παρακάτω:'}
          </p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {hotels.length === 0 && (
              <li>
                <a href="/en/admin/new-tenant" className="text-primary hover:underline">
                  {locale === 'en' ? 'Create a hotel' : 'Δημιουργήστε ένα κατάλυμα'}
                </a>
              </li>
            )}
            {businesses.length === 0 && (
              <li>
                <a href="/en/admin/businesses/new" className="text-primary hover:underline">
                  {locale === 'en' ? 'Create a business' : 'Δημιουργήστε μια επιχείρηση'}
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">{locale === 'en' ? 'Hotel' : 'Κατάλυμα'}</th>
            <th className="py-2">{locale === 'en' ? 'Business' : 'Επιχείρηση'}</th>
            <th className="py-2">Tier</th>
            <th className="py-2">% comm.</th>
            <th className="py-2">Priority</th>
            <th className="py-2">{locale === 'en' ? 'Billing' : 'Χρέωση'}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                {locale === 'en' ? 'No partnerships yet.' : 'Καμία συνεργασία ακόμη.'}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.hotelName}</td>
              <td className="py-2">{r.businessName}</td>
              <td className="py-2">
                <select
                  value={r.subscriptionTier}
                  onChange={(e) => setTier(r, e.target.value as SubscriptionTier)}
                  className="rounded border px-2 py-1 text-xs"
                  disabled={pending}
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2">{r.commissionPct.toFixed(1)}</td>
              <td className="py-2">{r.paidPriorityScore}</td>
              <td className="py-2">
                <PartnershipBillingPanel
                  partnershipId={r.id}
                  tier={r.subscriptionTier}
                  billingStatus={r.billingStatus}
                  billingEmail={r.billingEmail}
                />
              </td>
              <td className="py-2 text-right">
                <Badge
                  variant={r.active ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => toggleActive(r)}
                >
                  {r.active ? (locale === 'en' ? 'active' : 'ενεργή') : locale === 'en' ? 'inactive' : 'ανενεργή'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(r.id)}
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
          {locale === 'en' ? 'Add partnership' : 'Νέα συνεργασία'}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={draft.hotelId}
            onChange={(e) => setDraft({ ...draft, hotelId: e.target.value })}
            disabled={hotels.length === 0}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">
              {hotels.length === 0
                ? locale === 'en'
                  ? '— no hotels yet —'
                  : '— καμία εγγραφή —'
                : locale === 'en'
                  ? 'Select hotel…'
                  : 'Επιλέξτε κατάλυμα…'}
            </option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            value={draft.businessId}
            onChange={(e) => setDraft({ ...draft, businessId: e.target.value })}
            disabled={businesses.length === 0}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">
              {businesses.length === 0
                ? locale === 'en'
                  ? '— no businesses yet —'
                  : '— καμία εγγραφή —'
                : locale === 'en'
                  ? 'Select business…'
                  : 'Επιλέξτε επιχείρηση…'}
            </option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={draft.subscriptionTier}
            onChange={(e) =>
              setDraft({ ...draft, subscriptionTier: e.target.value as SubscriptionTier })
            }
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Input
            type="number"
            step="0.1"
            placeholder="commission %"
            value={draft.commissionPct}
            onChange={(e) => setDraft({ ...draft, commissionPct: Number(e.target.value) })}
          />
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="paid priority (0-100)"
            value={draft.paidPriorityScore}
            onChange={(e) => setDraft({ ...draft, paidPriorityScore: Number(e.target.value) })}
          />
          <Button
            onClick={add}
            disabled={pending || !draft.hotelId || !draft.businessId}
          >
            {locale === 'en' ? 'Add' : 'Προσθήκη'}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

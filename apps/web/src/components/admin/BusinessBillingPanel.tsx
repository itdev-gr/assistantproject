'use client';

import { useState, useTransition } from 'react';
import { Button, Badge, cn } from '@aga/ui';
import { useRouter } from '@/i18n/routing';
import {
  cancelBusinessSubscription,
  createBusinessCheckoutLink,
  setBusinessBillingExempt,
  syncBusinessBillingFromStripe,
} from '@/app/actions/admin-billing';
import { PLANS, formatEuro, type PaidTier } from '@/lib/plans';

interface Props {
  locale: string;
  businessId: string;
  billingStatus: string;
  subscriptionTier: string;
  billingExempt: boolean;
  billingEmail: string | null;
  hasSubscription: boolean;
  currentPeriodEnd: string | null;
  listed: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  past_due: 'bg-amber-100 text-amber-800',
  canceled: 'bg-red-100 text-red-700',
  checkout_sent: 'bg-sky-100 text-sky-800',
  unbilled: 'bg-muted text-muted-foreground',
};

/** Admin view of a business's subscription: comp toggle, payment link, cancel, sync. */
export function BusinessBillingPanel(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tier, setTier] = useState<PaidTier>('featured');
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (p.locale === 'en' ? en : el);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; url?: string }>, okText: string) =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      if (!res.ok) {
        setMessage(`${t('Error', 'Σφάλμα')}: ${res.error}`);
        return;
      }
      if (res.url) {
        try {
          await navigator.clipboard.writeText(res.url);
          setMessage(t('Payment link copied — send it to the business.', 'Ο σύνδεσμος πληρωμής αντιγράφηκε — στείλτε τον στην επιχείρηση.'));
        } catch {
          setMessage(`${t('Link', 'Σύνδεσμος')}: ${res.url}`);
        }
      } else {
        setMessage(okText);
      }
      router.refresh();
    });

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t('Subscription', 'Συνδρομή')}</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge className={cn('capitalize', STATUS_STYLES[p.billingStatus] ?? '')}>{p.billingStatus}</Badge>
          <span className="text-muted-foreground">
            {t('plan', 'πλάνο')}: {p.subscriptionTier}
          </span>
          {p.currentPeriodEnd && (
            <span className="text-muted-foreground">
              · {t('renews', 'ανανέωση')} {new Date(p.currentPeriodEnd).toLocaleDateString(p.locale === 'en' ? 'en-GB' : 'el-GR')}
            </span>
          )}
          <Badge variant={p.listed ? 'default' : 'secondary'}>{p.listed ? t('listed', 'δημοσιευμένη') : t('hidden', 'κρυφή')}</Badge>
        </div>
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={p.billingExempt}
          disabled={pending}
          onChange={(e) =>
            run(
              () => setBusinessBillingExempt({ businessId: p.businessId, exempt: e.target.checked }),
              t('Saved.', 'Αποθηκεύτηκε.'),
            )
          }
        />
        <span>
          <span className="font-medium">{t('Billing exempt (comp)', 'Απαλλαγή συνδρομής (comp)')}</span>
          <span className="block text-xs text-muted-foreground">
            {t(
              'Listed without a subscription. Use for editorial listings and agreed free placements.',
              'Δημοσιεύεται χωρίς συνδρομή. Για επιμελημένες καταχωρίσεις και συμφωνημένες δωρεάν τοποθετήσεις.',
            )}
          </span>
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as PaidTier)}
          className="h-8 rounded-md border border-input bg-background px-2"
          aria-label={t('Plan for payment link', 'Πλάνο για σύνδεσμο πληρωμής')}
        >
          {PLANS.map((pl) => (
            <option key={pl.tier} value={pl.tier}>
              {p.locale === 'en' ? pl.name.en : pl.name.el} · {formatEuro(pl.cents, p.locale)}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !p.billingEmail || p.billingExempt}
          onClick={() => run(() => createBusinessCheckoutLink({ businessId: p.businessId, tier }), '')}
        >
          {t('Create payment link', 'Σύνδεσμος πληρωμής')}
        </Button>
        {p.hasSubscription && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => cancelBusinessSubscription({ businessId: p.businessId }), t('Will cancel at period end.', 'Θα ακυρωθεί στο τέλος της περιόδου.'))}
          >
            {t('Cancel subscription', 'Ακύρωση συνδρομής')}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => syncBusinessBillingFromStripe({ businessId: p.businessId }), t('Synced from Stripe.', 'Συγχρονίστηκε από το Stripe.'))}
        >
          {t('Sync from Stripe', 'Συγχρονισμός από Stripe')}
        </Button>
      </div>
      {!p.billingEmail && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('Set a billing email on the business to create payment links.', 'Ορίστε billing email στην επιχείρηση για συνδέσμους πληρωμής.')}
        </p>
      )}
      {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { Button, cn } from '@aga/ui';
import { useRouter } from '@/i18n/routing';
import {
  createPartnerCheckout,
  createPartnerPortalSession,
  syncMyBillingFromStripe,
} from '@/app/actions/partner-billing';
import { PLANS, formatEuro, type PaidTier } from '@/lib/plans';

interface Props {
  locale: string;
  /** Payment is active (or past_due while Stripe retries) → portal instead of checkout. */
  subscribed: boolean;
  exempt: boolean;
  /** Plan picked at signup, preselected. */
  initialTier: PaidTier | null;
  currentTier: string;
}

export function PartnerBillingActions({
  locale,
  subscribed,
  exempt,
  initialTier,
  currentTier,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tier, setTier] = useState<PaidTier>(initialTier ?? 'featured');
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const loc = locale === 'en' ? 'en' : 'el';

  const describe = (error?: string) => {
    switch (error) {
      case 'already_active':
        return t(
          'You already have an active subscription — refreshing.',
          'Έχετε ήδη ενεργή συνδρομή — ανανέωση.',
        );
      case 'exempt':
        return t(
          'No payment is required for this listing.',
          'Δεν απαιτείται πληρωμή για αυτή την καταχώριση.',
        );
      case 'no_business':
        return t('No business is linked to this account.', 'Δεν υπάρχει συνδεδεμένη επιχείρηση.');
      default:
        return t('Something went wrong — try again.', 'Κάτι πήγε στραβά — δοκιμάστε ξανά.');
    }
  };

  const go = (fn: () => Promise<{ ok: boolean; url?: string; error?: string }>) =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      if (res.ok && res.url) {
        window.location.assign(res.url);
        return;
      }
      setMessage(describe(res.error));
      if (res.error === 'already_active') router.refresh();
    });

  if (exempt) {
    return (
      <p className="text-muted-foreground text-sm">
        {t(
          'Your listing is billing-exempt: no subscription is needed.',
          'Η καταχώρισή σας είναι απαλλαγμένη: δεν χρειάζεται συνδρομή.',
        )}
      </p>
    );
  }

  if (subscribed) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => go(() => createPartnerPortalSession({ locale: loc }))}
            disabled={pending}
          >
            {t('Manage subscription', 'Διαχείριση συνδρομής')}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setMessage(null);
                const res = await syncMyBillingFromStripe({});
                setMessage(
                  res.ok
                    ? t('Refreshed from Stripe.', 'Ανανεώθηκε από το Stripe.')
                    : describe(res.error),
                );
                router.refresh();
              })
            }
          >
            {t('Refresh status', 'Ανανέωση κατάστασης')}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {t(
            'Change plan, update your card or cancel from the Stripe portal. Changes apply immediately.',
            'Αλλαγή πλάνου, κάρτας ή ακύρωση από το portal της Stripe. Οι αλλαγές ισχύουν άμεσα.',
          )}
        </p>
        {message && <p className="text-muted-foreground text-xs">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('Plan', 'Πλάνο')}>
        {PLANS.map((p) => {
          const selected = tier === p.tier;
          return (
            <button
              key={p.tier}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTier(p.tier)}
              className={cn(
                'relative flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                  : 'border-input hover:bg-muted/50',
              )}
            >
              {selected && (
                <Check className="text-primary absolute right-3 top-3 h-4 w-4" aria-hidden />
              )}
              <span className="text-sm font-semibold">
                {locale === 'en' ? p.name.en : p.name.el}
              </span>
              <span className="text-xl font-semibold">
                {formatEuro(p.cents, locale)}
                <span className="text-muted-foreground text-xs font-normal">
                  /{t('year', 'έτος')}
                </span>
              </span>
              <span className="text-muted-foreground text-xs">
                {locale === 'en' ? p.tagline.en : p.tagline.el}
              </span>
              {currentTier === p.tier && (
                <span className="text-primary mt-1 text-[11px] uppercase tracking-wide">
                  {t('previous plan', 'προηγούμενο πλάνο')}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={() => go(() => createPartnerCheckout({ tier, locale: loc }))}
          disabled={pending}
        >
          {pending
            ? t('Opening Stripe…', 'Άνοιγμα Stripe…')
            : t('Complete payment', 'Ολοκλήρωση πληρωμής')}
        </Button>
        <p className="text-muted-foreground text-xs">
          {t(
            'Secure payment by Stripe. Billed yearly; cancel anytime and keep access until the period ends.',
            'Ασφαλής πληρωμή μέσω Stripe. Ετήσια χρέωση· ακύρωση όποτε θέλετε με πρόσβαση έως τη λήξη.',
          )}
        </p>
      </div>
      {message && <p className="text-muted-foreground text-xs">{message}</p>}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button, cn } from '@aga/ui';
import { useRouter } from '@/i18n/routing';
import {
  createHotelCheckout,
  createPortalSession,
  syncMyHotelBillingFromStripe,
} from '@/app/actions/owner-billing';
import { formatEuro } from '@/lib/plans';
import {
  HOTEL_PLANS,
  LAUNCH_OFFER_CENTS,
  isLaunchOfferEligible,
  type HotelPlan,
} from '@/lib/hotel-plans';

interface Props {
  locale: string;
  /** Payment is active (or past_due while Stripe retries) → portal instead of checkout. */
  subscribed: boolean;
  /** Only the owner role may pay or manage. */
  canManage: boolean;
  /** Package on record (admin-set or last paid), preselected. */
  currentPlan: HotelPlan;
  /** Free launch-offer slots; 0 hides the first-year price. */
  launchOfferRemaining: number;
  /** This hotel already holds a slot (checkout started earlier). */
  launchOfferHeld: boolean;
}

export function BillingActions({
  locale,
  subscribed,
  canManage,
  currentPlan,
  launchOfferRemaining,
  launchOfferHeld,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [plan, setPlan] = useState<HotelPlan>(currentPlan);
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const loc = locale === 'en' ? 'en' : 'el';
  const offerAvailable = launchOfferHeld || launchOfferRemaining > 0;

  const describe = (error?: string) => {
    switch (error) {
      case 'forbidden':
        return t(
          'Only the owner account can manage billing.',
          'Μόνο ο λογαριασμός ιδιοκτήτη μπορεί να διαχειριστεί τη συνδρομή.',
        );
      case 'already_active':
        return t(
          'You already have an active subscription — refreshing.',
          'Έχετε ήδη ενεργή συνδρομή — ανανέωση.',
        );
      case 'not_configured':
        return t(
          'Payments are not configured on this environment.',
          'Οι πληρωμές δεν είναι ρυθμισμένες σε αυτό το περιβάλλον.',
        );
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

  if (!canManage) {
    return (
      <p className="text-muted-foreground text-sm">
        {t(
          'Only the owner account can start or manage the subscription.',
          'Μόνο ο λογαριασμός ιδιοκτήτη μπορεί να ξεκινήσει ή να διαχειριστεί τη συνδρομή.',
        )}
      </p>
    );
  }

  if (subscribed) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => go(() => createPortalSession({ locale: loc }))} disabled={pending}>
            {t('Manage subscription', 'Διαχείριση συνδρομής')}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setMessage(null);
                const res = await syncMyHotelBillingFromStripe({});
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
            'Change package, update your card or cancel from the Stripe portal.',
            'Αλλαγή πακέτου, κάρτας ή ακύρωση από το portal της Stripe.',
          )}
        </p>
        {message && <p className="text-muted-foreground text-xs">{message}</p>}
      </div>
    );
  }

  const group = (audience: 'hotel' | 'accommodation') =>
    HOTEL_PLANS.filter((p) => p.audience === audience);

  const card = (p: (typeof HOTEL_PLANS)[number]) => {
    const selected = plan === p.plan;
    const discounted = offerAvailable && isLaunchOfferEligible(p.plan);
    return (
      <button
        key={p.plan}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => setPlan(p.plan)}
        className={cn(
          'relative flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors',
          selected
            ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
            : 'border-input hover:bg-muted/50',
        )}
      >
        {selected && <Check className="text-primary absolute right-3 top-3 h-4 w-4" aria-hidden />}
        <span className="text-sm font-semibold">{locale === 'en' ? p.name.en : p.name.el}</span>
        {discounted ? (
          <span className="text-xl font-semibold">
            {formatEuro(LAUNCH_OFFER_CENTS, locale)}
            <span className="text-muted-foreground text-xs font-normal">
              {' '}
              {t('first year', 'πρώτος χρόνος')}
            </span>
            <span className="text-muted-foreground ml-2 text-sm font-normal line-through">
              {formatEuro(p.cents, locale)}
            </span>
          </span>
        ) : (
          <span className="text-xl font-semibold">
            {formatEuro(p.cents, locale)}
            <span className="text-muted-foreground text-xs font-normal">/{t('year', 'έτος')}</span>
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {locale === 'en' ? p.tagline.en : p.tagline.el}
        </span>
        {currentPlan === p.plan && (
          <span className="text-primary mt-1 text-[11px] uppercase tracking-wide">
            {t('current package', 'τρέχον πακέτο')}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {offerAvailable && (
        <p className="bg-gold/10 text-deep-ink flex items-start gap-2 rounded-md p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {launchOfferHeld
              ? t(
                  'Your launch-offer slot is reserved: Professional, Advanced and Enterprise cost 990 € for the first year.',
                  'Η θέση σας στην προσφορά έναρξης είναι κρατημένη: Professional, Advanced και Enterprise κοστίζουν 990 € τον πρώτο χρόνο.',
                )
              : t(
                  `Launch offer — ${launchOfferRemaining} of 50 spots left: Professional, Advanced and Enterprise cost 990 € for the first year, then the normal price.`,
                  `Προσφορά έναρξης — απομένουν ${launchOfferRemaining} από 50 θέσεις: Professional, Advanced και Enterprise κοστίζουν 990 € τον πρώτο χρόνο, μετά την κανονική τιμή.`,
                )}
          </span>
        </p>
      )}
      <div role="radiogroup" aria-label={t('Package', 'Πακέτο')} className="space-y-4">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            {t('Hotels', 'Ξενοδοχεία')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">{group('hotel').map(card)}</div>
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            {t('Small accommodation', 'Μικρά καταλύματα')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">{group('accommodation').map(card)}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={() => go(() => createHotelCheckout({ plan, locale: loc }))}
          disabled={pending}
        >
          {pending
            ? t('Opening Stripe…', 'Άνοιγμα Stripe…')
            : t('Complete payment', 'Ολοκλήρωση πληρωμής')}
        </Button>
        <p className="text-muted-foreground text-xs">
          {t(
            'Secure payment by Stripe. Billed yearly, VAT included.',
            'Ασφαλής πληρωμή μέσω Stripe. Ετήσια χρέωση, με ΦΠΑ.',
          )}
        </p>
      </div>
      {message && <p className="text-muted-foreground text-xs">{message}</p>}
    </div>
  );
}

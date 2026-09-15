'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { syncHotelBillingFromStripe } from '@/app/actions/admin-billing';

interface Props {
  locale: string;
  hotelId: string;
  hasSubscription: boolean;
}

/** Admin "make DB = Stripe" for a hotel's package / status / renewal. */
export function HotelBillingSyncButton({ locale, hotelId, hasSubscription }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const r = await syncHotelBillingFromStripe({ hotelId });
            setMessage(
              r.ok
                ? r.state
                  ? t(
                      `Synced: ${r.state.billing_status}${r.state.plan ? ` · ${r.state.plan}` : ''}`,
                      `Συγχρονίστηκε: ${r.state.billing_status}${r.state.plan ? ` · ${r.state.plan}` : ''}`,
                    )
                  : t('No subscription in Stripe.', 'Καμία συνδρομή στο Stripe.')
                : t('Sync failed.', 'Ο συγχρονισμός απέτυχε.'),
            );
            router.refresh();
          })
        }
      >
        {pending
          ? t('Syncing…', 'Συγχρονισμός…')
          : t('Sync from Stripe', 'Συγχρονισμός από Stripe')}
      </Button>
      {!hasSubscription && (
        <span className="text-muted-foreground text-xs">
          {t('No Stripe subscription on record yet.', 'Δεν υπάρχει ακόμη συνδρομή Stripe.')}
        </span>
      )}
      {message && <span className="text-muted-foreground text-xs">{message}</span>}
    </div>
  );
}

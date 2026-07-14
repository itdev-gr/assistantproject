'use client';

import { useState, useTransition } from 'react';
import { Button } from '@aga/ui';
import { createHotelCheckout, createPortalSession } from '@/app/actions/owner-billing';

export function BillingActions({ locale, subscribed }: { locale: string; subscribed: boolean }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  const go = (fn: () => Promise<{ ok: boolean; url?: string; error?: string }>) =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      if (res.ok && res.url) {
        window.location.assign(res.url);
        return;
      }
      setMessage(
        res.error === 'forbidden'
          ? t('Only the owner account can manage billing.', 'Μόνο ο λογαριασμός ιδιοκτήτη μπορεί να διαχειριστεί τη συνδρομή.')
          : t('Something went wrong — try again.', 'Κάτι πήγε στραβά — δοκιμάστε ξανά.'),
      );
    });

  return (
    <div className="flex flex-col items-start gap-2">
      {subscribed ? (
        <Button onClick={() => go(createPortalSession)} disabled={pending}>
          {t('Manage billing', 'Διαχείριση συνδρομής')}
        </Button>
      ) : (
        <Button onClick={() => go(createHotelCheckout)} disabled={pending}>
          {t('Subscribe', 'Εγγραφή συνδρομής')}
        </Button>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { Button } from '@aga/ui';
import { createHotelCheckout, createPortalSession } from '@/app/actions/owner-billing';

export function BillingActions({ locale, subscribed }: { locale: string; subscribed: boolean }) {
  const [pending, start] = useTransition();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  const go = (fn: () => Promise<{ ok: boolean; url?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok && res.url) window.location.assign(res.url);
    });

  return subscribed ? (
    <Button onClick={() => go(createPortalSession)} disabled={pending}>
      {t('Manage billing', 'Διαχείριση συνδρομής')}
    </Button>
  ) : (
    <Button onClick={() => go(createHotelCheckout)} disabled={pending}>
      {t('Subscribe', 'Εγγραφή συνδρομής')}
    </Button>
  );
}

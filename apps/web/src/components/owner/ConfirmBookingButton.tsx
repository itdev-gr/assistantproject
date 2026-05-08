'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input } from '@aga/ui';
import { confirmReferralBooked } from '@/app/actions/owner-bookings';

interface Props {
  referralId: string;
  locale: string;
}

export function ConfirmBookingButton({ referralId, locale }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = amount.trim() === '' ? null : Number(amount);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      setError(t('Invalid amount', 'Μη έγκυρο ποσό'));
      return;
    }
    start(async () => {
      const r = await confirmReferralBooked({
        referralId,
        grossAmount: parsed,
        currency: 'EUR',
        notes: null,
      });
      if (r.ok) {
        setDone(true);
        setOpen(false);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  if (done) {
    return <span className="text-xs text-emerald-600">{t('Booked ✓', 'Καταχωρήθηκε ✓')}</span>;
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t('Mark as booked', 'Κράτηση')}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder={t('€ amount (optional)', '€ ποσό (προαιρετικό)')}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-8 w-36 text-xs"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? '…' : t('Save', 'Αποθήκευση')}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        ×
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}

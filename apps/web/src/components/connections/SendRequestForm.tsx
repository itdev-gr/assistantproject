'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input, Textarea } from '@aga/ui';
import { createBusinessRequest, createHotelRequest } from '@/app/actions/connections';
import { errorMessage } from '@/lib/connections';
import { dashLabel } from '@/components/dashboard/field-classes';
import { MAX_COMMISSION_PCT } from '@aga/api-contracts';

interface Props {
  locale: string;
  /** Which side the current user acts for. */
  side: 'hotel' | 'business';
  /** The other party: business id (hotel side) or hotel id (business side). */
  targetId: string;
  targetName: string;
  /** Business the partner sends on behalf of (business side only). */
  businessId?: string;
  triggerLabel?: string;
}

/**
 * Inline "Send request" expander: a required message plus optional extras
 * (commission %, guest offer) hidden behind an "Add extras" toggle.
 */
export function SendRequestForm({
  locale,
  side,
  targetId,
  targetName,
  businessId,
  triggerLabel,
}: Props) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [open, setOpen] = useState(false);
  const [extras, setExtras] = useState(false);
  const [message, setMessage] = useState('');
  const [commission, setCommission] = useState('');
  const [offer, setOffer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const extra = extras ? { proposedCommissionPct: commission, guestOffer: offer } : {};
      const r =
        side === 'hotel'
          ? await createHotelRequest({ businessId: targetId, message, ...extra })
          : await createBusinessRequest({
              hotelId: targetId,
              businessId: businessId ?? '',
              message,
              ...extra,
            });
      if (!r.ok) {
        setError(errorMessage(r.error, locale));
        return;
      }
      const unclaimed = 'unclaimed' in r && r.unclaimed;
      setDone(
        unclaimed
          ? t(
              'Request sent. This business has no account yet, so our team will answer on their behalf.',
              'Το αίτημα στάλθηκε. Η επιχείρηση δεν έχει ακόμη λογαριασμό, οπότε θα απαντήσει η ομάδα μας για λογαριασμό της.',
            )
          : t('Request sent.', 'Το αίτημα στάλθηκε.'),
      );
      setOpen(false);
      router.refresh();
    });
  }

  if (done) return <p className="text-olive text-xs">{done}</p>;

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        {triggerLabel ?? t('Send request', 'Αποστολή αιτήματος')}
      </Button>
    );
  }

  return (
    <div className="bg-background/60 mt-2 w-full max-w-xl space-y-3 rounded-lg border p-3">
      <p className="text-muted-foreground text-[13px]">
        {t('Request to', 'Αίτημα προς')}{' '}
        <span className="text-foreground font-medium">{targetName}</span>
      </p>
      <div className="space-y-1">
        <label className={dashLabel} htmlFor={`msg-${targetId}`}>
          {t('Message', 'Μήνυμα')} *
        </label>
        <Textarea
          id={`msg-${targetId}`}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t(
            'Introduce yourselves and say why you want to work together (at least 10 characters).',
            'Συστηθείτε και πείτε γιατί θέλετε να συνεργαστείτε (τουλάχιστον 10 χαρακτήρες).',
          )}
        />
      </div>

      {!extras ? (
        <button
          type="button"
          onClick={() => setExtras(true)}
          className="text-primary cursor-pointer text-[13px] hover:underline"
        >
          + {t('Add extras (commission, guest offer)', 'Προσθήκη extra (προμήθεια, προσφορά)')}
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={dashLabel} htmlFor={`pct-${targetId}`}>
              {t('Proposed commission %', 'Προτεινόμενη προμήθεια %')}
            </label>
            <Input
              id={`pct-${targetId}`}
              type="number"
              min={0}
              max={MAX_COMMISSION_PCT}
              step={0.5}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="10"
            />
            <p className="text-muted-foreground text-[11px]">
              {t(
                'On bookings made through RoomRiv. Up to 10%, depending on the partnership. Leave empty for no commission.',
                'Σε κρατήσεις μέσω RoomRiv. Έως 10%, ανάλογα με τη συνεργασία. Κενό = χωρίς προμήθεια.',
              )}
            </p>
          </div>
          <div className="space-y-1">
            <label className={dashLabel} htmlFor={`offer-${targetId}`}>
              {t('Offer for guests', 'Προσφορά για επισκέπτες')}
            </label>
            <Input
              id={`offer-${targetId}`}
              maxLength={200}
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder={t('10% off with the hotel QR', '10% έκπτωση με το QR του ξενοδοχείου')}
            />
            <p className="text-muted-foreground text-[11px]">
              {t(
                'Shown to guests in the assistant once connected.',
                'Εμφανίζεται στους επισκέπτες μόλις συνδεθείτε.',
              )}
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" disabled={pending || message.trim().length < 10} onClick={submit}>
          {pending ? t('Sending…', 'Αποστολή…') : t('Send request', 'Αποστολή αιτήματος')}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          {t('Cancel', 'Άκυρο')}
        </Button>
      </div>
    </div>
  );
}

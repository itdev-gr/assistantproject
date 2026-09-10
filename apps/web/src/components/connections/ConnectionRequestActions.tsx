'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Textarea } from '@aga/ui';
import { cancelRequest, decideRequest, disconnectPartnership } from '@/app/actions/connections';
import { errorMessage } from '@/lib/connections';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';

interface DecideProps {
  locale: string;
  requestId: string;
  /** e.g. "Accept at 12% commission" — built by the server page from the terms. */
  acceptLabel: string;
}

/** Accept / decline (with optional reason) for the receiving side or an admin. */
export function DecideRequestActions({ locale, requestId, acceptLabel }: DecideProps) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(accept: boolean) {
    setError(null);
    start(async () => {
      const r = await decideRequest({
        requestId,
        accept,
        declineReason: accept ? undefined : reason.trim() || undefined,
      });
      if (r.ok) {
        setDeclining(false);
        router.refresh();
      } else {
        setError(errorMessage(r.error, locale));
      }
    });
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(true)}>
          {acceptLabel}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setDeclining((v) => !v)}>
          {t('Decline', 'Απόρριψη')}
        </Button>
      </div>
      {declining && (
        <div className="space-y-2">
          <Textarea
            rows={2}
            maxLength={500}
            placeholder={t('Reason (optional, shown to the sender)', 'Αιτιολογία (προαιρετικό, φαίνεται στον αποστολέα)')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="max-w-xl"
          />
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(false)}>
            {t('Confirm decline', 'Επιβεβαίωση απόρριψης')}
          </Button>
        </div>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

interface CancelProps {
  locale: string;
  requestId: string;
}

/** The sender withdraws a pending request. */
export function CancelRequestButton({ locale, requestId }: CancelProps) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await cancelRequest({ requestId });
            if (r.ok) router.refresh();
            else setError(errorMessage(r.error, locale));
          })
        }
      >
        {t('Withdraw', 'Ανάκληση')}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

interface DisconnectProps {
  locale: string;
  partnershipId: string;
  counterpartyName: string;
}

/** Hotel owner (or admin) ends an active connection. */
export function DisconnectButton({ locale, partnershipId, counterpartyName }: DisconnectProps) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="ghost">
            {t('Disconnect', 'Αποσύνδεση')}
          </Button>
        }
        title={t('End this connection?', 'Τερματισμός συνεργασίας;')}
        description={t(
          `${counterpartyName} will stop being recommended to your guests. You can send a new request later.`,
          `Το ${counterpartyName} θα πάψει να προτείνεται στους επισκέπτες σας. Μπορείτε να στείλετε νέο αίτημα αργότερα.`,
        )}
        confirmLabel={t('Disconnect', 'Αποσύνδεση')}
        cancelLabel={t('Keep', 'Διατήρηση')}
        danger
        onConfirm={async () => {
          const r = await disconnectPartnership({ partnershipId });
          if (r.ok) router.refresh();
          else setError(errorMessage(r.error, locale));
        }}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

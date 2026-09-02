'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input, Textarea } from '@aga/ui';
import { decidePartnerApplication } from '@/app/actions/admin-partners';

interface Props {
  applicationId: string;
  locale: string;
}

type Mode = 'idle' | 'link' | 'reject';

export function PartnerApplicationActions({ applicationId, locale }: Props) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [mode, setMode] = useState<Mode>('idle');
  const [existingId, setExistingId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(input: { approve: boolean; existingBusinessId?: string; rejectionReason?: string }) {
    setError(null);
    start(async () => {
      const r = await decidePartnerApplication({ applicationId, ...input });
      if (r.ok) {
        setMode('idle');
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run({ approve: true })}>
          {t('Approve & create listing', 'Έγκριση & δημιουργία')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setMode(mode === 'link' ? 'idle' : 'link')}
        >
          {t('Link existing business', 'Σύνδεση με υπάρχουσα')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setMode(mode === 'reject' ? 'idle' : 'reject')}
        >
          {t('Reject', 'Απόρριψη')}
        </Button>
      </div>

      {mode === 'link' && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t('Business ID (uuid)', 'ID επιχείρησης (uuid)')}
            value={existingId}
            onChange={(e) => setExistingId(e.target.value)}
            className="max-w-sm font-mono text-xs"
          />
          <Button
            size="sm"
            disabled={pending || !existingId.trim()}
            onClick={() => run({ approve: true, existingBusinessId: existingId.trim() })}
          >
            {t('Approve & link', 'Έγκριση & σύνδεση')}
          </Button>
        </div>
      )}

      {mode === 'reject' && (
        <div className="space-y-2">
          <Textarea
            rows={2}
            placeholder={t(
              'Reason (shown to the applicant)',
              'Αιτιολογία (φαίνεται στον αιτούντα)',
            )}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="max-w-xl"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run({ approve: false, rejectionReason: reason.trim() || undefined })}
          >
            {t('Confirm rejection', 'Επιβεβαίωση απόρριψης')}
          </Button>
        </div>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

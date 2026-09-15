'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Wrench } from 'lucide-react';
import { Button } from '@aga/ui';
import { useRouter } from '@/i18n/routing';
import { applyReconcileFix, runReconciliationNow } from '@/app/actions/admin-reconcile';
import type { FixAction } from '@/lib/billing-reconcile';

export function RunReconciliationButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const res = await runReconciliationNow();
            if (!res.ok) {
              setMessage(
                t(
                  'The audit could not run — check Stripe configuration.',
                  'Ο έλεγχος δεν έτρεξε — ελέγξτε τη ρύθμιση Stripe.',
                ),
              );
              return;
            }
            setMessage(
              res.clean
                ? t(
                    `Clean. ${res.healed} healed automatically.`,
                    `Καθαρό. ${res.healed} διορθώθηκαν αυτόματα.`,
                  )
                : t(
                    `${res.remaining} issue(s) need attention (${res.healed} healed).`,
                    `${res.remaining} θέματα χρειάζονται προσοχή (${res.healed} διορθώθηκαν).`,
                  ),
            );
            router.refresh();
          })
        }
      >
        <RefreshCw className={pending ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} aria-hidden />
        {pending ? t('Running…', 'Εκτέλεση…') : t('Run audit now', 'Εκτέλεση ελέγχου')}
      </Button>
      {message && <p className="text-muted-foreground text-xs">{message}</p>}
    </div>
  );
}

export function FixButton({ fix, locale }: { fix: FixAction; locale: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<'ok' | 'fail' | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const label: Record<FixAction['action'], string> = {
    sync_business: t('Sync from Stripe', 'Συγχρονισμός από Stripe'),
    sync_hotel: t('Sync from Stripe', 'Συγχρονισμός από Stripe'),
    replay_event: t('Replay event', 'Επανεκτέλεση event'),
    ingest_event: t('Fetch & process', 'Λήψη & επεξεργασία'),
    mark_commission_paid: t('Mark paid', 'Σήμανση ως πληρωμένο'),
    release_launch_offer: t('Release slot', 'Απελευθέρωση θέσης'),
  };
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending || done === 'ok'}
      onClick={() =>
        start(async () => {
          const res = await applyReconcileFix(fix);
          setDone(res.ok ? 'ok' : 'fail');
          router.refresh();
        })
      }
    >
      <Wrench className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      {done === 'ok'
        ? t('Fixed', 'Διορθώθηκε')
        : done === 'fail'
          ? t('Failed', 'Απέτυχε')
          : label[fix.action]}
    </Button>
  );
}

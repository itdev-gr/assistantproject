'use client';

import { useState, useTransition } from 'react';
import { Button, cn } from '@aga/ui';
import { reindexKnowledge } from '@/app/actions/admin-knowledge';

export function ReindexKnowledgeButton({ locale }: { locale: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [hasFailures, setHasFailures] = useState(false);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  function run() {
    start(async () => {
      setMessage(null);
      setHasFailures(false);
      const res = await reindexKnowledge();
      if (!res.ok) {
        setHasFailures(true);
        setMessage(t('Reindex failed — try again.', 'Η επανευρετηρίαση απέτυχε — δοκιμάστε ξανά.'));
        return;
      }
      const updated = res.results.reduce((sum, r) => sum + ('error' in r ? 0 : r.upserted), 0);
      const deleted = res.results.reduce((sum, r) => sum + ('error' in r ? 0 : r.deleted), 0);
      const unchanged = res.results.reduce((sum, r) => sum + ('error' in r ? 0 : r.skipped), 0);
      const failed = res.results.reduce((sum, r) => sum + ('error' in r ? 1 : 0), 0);
      setHasFailures(failed > 0);
      setMessage(
        failed > 0
          ? t(
              `Indexed: ${updated} updated, ${deleted} deleted, ${unchanged} unchanged, ${failed} failed.`,
              `Ευρετήριο: ${updated} ενημερώθηκαν, ${deleted} διαγράφηκαν, ${unchanged} αμετάβλητα, ${failed} απέτυχαν.`,
            )
          : t(
              `Indexed: ${updated} updated, ${deleted} deleted, ${unchanged} unchanged.`,
              `Ευρετήριο: ${updated} ενημερώθηκαν, ${deleted} διαγράφηκαν, ${unchanged} αμετάβλητα.`,
            ),
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={run} disabled={pending}>
        {t('Reindex knowledge base', 'Επανευρετηρίαση βάσης γνώσης')}
      </Button>
      {message && (
        <span className={cn('text-xs', hasFailures ? 'text-destructive' : 'text-muted-foreground')}>
          {message}
        </span>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Button } from '@aga/ui';
import { reindexKnowledge } from '@/app/actions/admin-knowledge';

export function ReindexKnowledgeButton({ locale }: { locale: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  function run() {
    start(async () => {
      setMessage(null);
      const res = await reindexKnowledge();
      if (!res.ok) {
        setMessage(t('Reindex failed — try again.', 'Η επανευρετηρίαση απέτυχε — δοκιμάστε ξανά.'));
        return;
      }
      const updated = res.results.reduce((sum, r) => sum + r.upserted, 0);
      const deleted = res.results.reduce((sum, r) => sum + r.deleted, 0);
      const unchanged = res.results.reduce((sum, r) => sum + r.skipped, 0);
      setMessage(
        t(
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
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Button } from '@aga/ui';
import { invoiceAccruedCommissions } from '@/app/actions/admin-billing';

export function InvoiceCommissionsButton({ locale }: { locale: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  function run() {
    start(async () => {
      setMessage(null);
      const res = await invoiceAccruedCommissions();
      if (!res.ok) {
        setMessage(t('Invoicing failed — try again.', 'Η τιμολόγηση απέτυχε — δοκιμάστε ξανά.'));
        return;
      }
      const invoicedCount = res.invoiced.length;
      const failedCount = res.failed.length;
      setMessage(
        failedCount > 0
          ? t(
              `${invoicedCount} invoiced, ${failedCount} failed.`,
              `${invoicedCount} τιμολογήθηκαν, ${failedCount} απέτυχαν.`,
            )
          : t(`${invoicedCount} invoiced.`, `${invoicedCount} τιμολογήθηκαν.`),
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={run} disabled={pending}>
        {t('Invoice accrued commissions', 'Τιμολόγηση δεδουλευμένων προμηθειών')}
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import {
  regenerateWebhookSecret,
  clearWebhookSecret,
} from '@/app/actions/admin-webhook-secret';

interface Props {
  businessId: string;
  webhookConfigured: boolean;
  appOrigin: string;
  locale: string;
}

export function WebhookSecretCard({
  businessId,
  webhookConfigured,
  appOrigin,
  locale,
}: Props) {
  const [pending, start] = useTransition();
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'url' | 'secret' | null>(null);
  const [enabled, setEnabled] = useState(webhookConfigured);

  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const url = `${appOrigin}/api/webhooks/partner/${businessId}`;

  function regenerate() {
    if (
      enabled &&
      !confirm(
        t(
          'Rotate the secret? The partner will need to update their integration.',
          'Νέο μυστικό; Ο συνεργάτης πρέπει να ενημερώσει την ενσωμάτωσή του.',
        ),
      )
    ) {
      return;
    }
    setError(null);
    start(async () => {
      const r = await regenerateWebhookSecret({ businessId });
      if (r.ok) {
        setRevealedSecret(r.secret);
        setEnabled(true);
      } else {
        setError(r.error);
      }
    });
  }

  function disable() {
    if (!confirm(t('Disable webhook? The endpoint will return 404.', 'Απενεργοποίηση webhook;')))
      return;
    setError(null);
    start(async () => {
      const r = await clearWebhookSecret({ businessId });
      if (r.ok) {
        setEnabled(false);
        setRevealedSecret(null);
      } else {
        setError(r.error ?? 'failed');
      }
    });
  }

  function copy(text: string, field: 'url' | 'secret') {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('Booking webhook', 'Webhook κράτησης')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {t(
            "Share these with the partner's POS / booking system. They POST to the URL with the body signed by HMAC-SHA256 over `${ts}.${rawBody}` using the secret. We auto-create a confirmed booking and accrue commission.",
            'Δώστε τα στο σύστημα κρατήσεων του συνεργάτη. Στέλνουν POST με υπογραφή HMAC-SHA256 του "${ts}.${rawBody}" με το μυστικό. Καταχωρούμε αυτόματα την κράτηση και την προμήθεια.',
          )}
        </p>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('Endpoint', 'Διεύθυνση')}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted px-2 py-1.5 font-mono text-xs">
              POST {url}
            </code>
            <Button type="button" size="sm" variant="ghost" onClick={() => copy(url, 'url')}>
              {copiedField === 'url' ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
            </Button>
          </div>
        </div>

        {revealedSecret ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-700">
              {t('Secret (shown once)', 'Μυστικό (εμφανίζεται μόνο μία φορά)')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 font-mono text-xs">
                {revealedSecret}
              </code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => copy(revealedSecret, 'secret')}
              >
                {copiedField === 'secret' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
              </Button>
            </div>
            <p className="mt-1 text-xs text-amber-700">
              {t(
                'Copy now — refreshing this page will hide it. Generating again rotates it.',
                'Αντιγράψτε τώρα — η ανανέωση το αποκρύπτει. Νέα δημιουργία το αλλάζει.',
              )}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {enabled
              ? t('A secret is set. Generate a new one to rotate it.', 'Έχει οριστεί μυστικό. Δημιουργήστε νέο για ανανέωση.')
              : t('No secret set. Generate one to enable the webhook.', 'Δεν υπάρχει μυστικό. Δημιουργήστε ένα για ενεργοποίηση.')}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" disabled={pending} onClick={regenerate}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {enabled
              ? t('Rotate secret', 'Ανανέωση μυστικού')
              : t('Generate secret', 'Δημιουργία μυστικού')}
          </Button>
          {enabled && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={disable}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t('Disable webhook', 'Απενεργοποίηση')}
            </Button>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

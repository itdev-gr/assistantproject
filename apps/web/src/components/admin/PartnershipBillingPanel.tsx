'use client';

import { useState, useTransition } from 'react';
import { Button, Badge, cn } from '@aga/ui';
import { createCheckoutLink, cancelTierSubscription } from '@/app/actions/admin-billing';

interface Props {
  partnershipId: string;
  tier: string;
  billingStatus: string;
  billingEmail: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  past_due: 'bg-amber-100 text-amber-800',
  canceled: 'bg-red-100 text-red-700',
  checkout_sent: 'bg-sky-100 text-sky-800',
  unbilled: 'bg-muted text-muted-foreground',
};

export function PartnershipBillingPanel({ partnershipId, tier, billingStatus, billingEmail }: Props) {
  const [pending, start] = useTransition();
  const [selectedTier, setSelectedTier] = useState<'standard' | 'featured' | 'exclusive'>('featured');
  const [message, setMessage] = useState<string | null>(null);

  function generateLink() {
    start(async () => {
      setMessage(null);
      const res = await createCheckoutLink({ partnershipId, tier: selectedTier });
      if (!res.ok) {
        setMessage(
          res.error === 'missing_billing_email'
            ? 'Set a billing email on the business first.'
            : res.error === 'already_active'
              ? 'Already has an active subscription — cancel it first.'
              : `Error: ${res.error}`,
        );
        return;
      }
      try {
        await navigator.clipboard.writeText(res.url);
        setMessage('Payment link copied — send it to the business.');
      } catch {
        setMessage(`Copy failed — link: ${res.url}`);
      }
    });
  }

  function cancel() {
    start(async () => {
      const res = await cancelTierSubscription({ partnershipId });
      setMessage(res.ok ? 'Will cancel at period end.' : `Error: ${res.error}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge className={cn('capitalize', STATUS_STYLES[billingStatus] ?? '')}>{billingStatus}</Badge>
      <span className="text-muted-foreground">tier: {tier}</span>
      <select
        value={selectedTier}
        onChange={(e) => setSelectedTier(e.target.value as typeof selectedTier)}
        className="h-8 rounded-md border border-input bg-background px-2"
        aria-label="Tier for payment link"
      >
        <option value="standard">Standard</option>
        <option value="featured">Featured</option>
        <option value="exclusive">Exclusive</option>
      </select>
      <Button size="sm" variant="outline" onClick={generateLink} disabled={pending || !billingEmail}>
        Create payment link
      </Button>
      {billingStatus === 'active' && (
        <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
          Cancel subscription
        </Button>
      )}
      {message && <p className="w-full text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

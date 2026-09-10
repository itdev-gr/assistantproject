'use client';

import { Badge, cn } from '@aga/ui';
import { Link } from '@/i18n/routing';

interface Props {
  businessId: string;
  /** Partnership-level tier — now only an admin override for this hotel. */
  tier: string;
  /** Business-level billing status (the billed subscription lives on the business). */
  businessBillingStatus: string;
  businessTier: string;
  businessExempt: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  past_due: 'bg-amber-100 text-amber-800',
  canceled: 'bg-red-100 text-red-700',
  checkout_sent: 'bg-sky-100 text-sky-800',
  unbilled: 'bg-muted text-muted-foreground',
};

/**
 * Read-only billing summary per partnership row. Subscriptions are billed per
 * business since migration 0017; payment links, comps and cancellation live
 * on the business page.
 */
export function PartnershipBillingPanel({ businessId, tier, businessBillingStatus, businessTier, businessExempt }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge className={cn('capitalize', STATUS_STYLES[businessBillingStatus] ?? '')}>
        {businessExempt ? 'exempt' : businessBillingStatus}
      </Badge>
      <span className="text-muted-foreground">plan: {businessTier}</span>
      {tier !== 'free' && tier !== businessTier && (
        <span className="text-muted-foreground">(override: {tier})</span>
      )}
      <Link
        href={`/admin/businesses/${businessId}`}
        className="text-primary underline-offset-2 hover:underline"
      >
        Billing →
      </Link>
    </div>
  );
}

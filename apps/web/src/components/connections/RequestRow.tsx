import type { ConnectionInitiator, ConnectionRequestStatus } from '@aga/api-contracts';
import { Pill } from '@/components/dashboard/Pill';
import { tableRow } from '@/components/dashboard/TableFrame';
import { formatCommission, statusLabel, statusTone } from '@/lib/connections';

export interface RequestRowData {
  id: string;
  status: ConnectionRequestStatus;
  initiated_by: ConnectionInitiator;
  message: string;
  proposed_commission_pct: number | null;
  guest_offer: string | null;
  decline_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

interface Props {
  locale: string;
  request: RequestRowData;
  /** The other party as seen by the viewer (or both parties for admins). */
  title: string;
  subtitle?: string;
  /** Extra pills (e.g. "Unclaimed", "Hotel → business"). */
  tags?: React.ReactNode;
  actions?: React.ReactNode;
}

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR');
}

/** One request with its message, proposed terms, status and action slot. */
export function RequestRow({ locale, request, title, subtitle, tags, actions }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const commission = formatCommission(request.proposed_commission_pct, locale);
  return (
    <div className={`space-y-2 px-4 py-4 ${tableRow}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[14px] font-medium">{title}</p>
        <Pill tone={statusTone(request.status)}>{statusLabel(request.status, locale)}</Pill>
        {tags}
        <span className="text-muted-foreground text-xs">
          {fmtDate(request.created_at, locale)}
          {request.decided_at ? ` → ${fmtDate(request.decided_at, locale)}` : ''}
        </span>
      </div>
      {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      <p className="whitespace-pre-line text-[14px]">{request.message}</p>
      {(commission || request.guest_offer) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {commission && <Pill tone="info">{commission}</Pill>}
          {request.guest_offer && (
            <Pill tone="ok">
              {t('Offer', 'Προσφορά')}: {request.guest_offer}
            </Pill>
          )}
        </div>
      )}
      {request.status === 'declined' && request.decline_reason && (
        <p className="text-destructive text-xs">
          {t('Reason', 'Αιτιολογία')}: {request.decline_reason}
        </p>
      )}
      {actions}
    </div>
  );
}

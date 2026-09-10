/**
 * Pure helpers for the hotel ⇄ business connection-request feature. No I/O:
 * the server actions and pages pass plain rows in, so these rules are easy
 * to unit-test.
 */
import type { ConnectionInitiator, ConnectionRequestStatus } from '@aga/api-contracts';

/** Mirrors PillTone in components/dashboard/Pill (kept local so tests need no path alias). */
type PillTone = 'ok' | 'warn' | 'danger' | 'muted' | 'info';

/** Stable error codes raised by the 0015 RPCs (plus client-side ones). */
export const CONNECTION_ERROR_CODES = [
  'forbidden',
  'not_pending',
  'already_connected',
  'already_pending',
  'reverse_pending',
  'target_unavailable',
  'invalid_input',
  'unknown',
] as const;
export type ConnectionErrorCode = (typeof CONNECTION_ERROR_CODES)[number];

/** Map a PostgREST/Postgres error message to one of our codes. */
export function requestErrorCode(message: string | null | undefined): ConnectionErrorCode {
  const m = (message ?? '').trim();
  const hit = CONNECTION_ERROR_CODES.find((c) => c !== 'unknown' && m === c);
  if (hit) return hit;
  // The partial unique index fires when two sends race; treat it as a duplicate.
  if (/partnership_requests_one_pending|duplicate key/i.test(m)) return 'already_pending';
  return 'unknown';
}

export function errorMessage(code: ConnectionErrorCode, locale: string): string {
  const en: Record<ConnectionErrorCode, string> = {
    forbidden: 'You are not allowed to do that.',
    not_pending: 'This request has already been answered.',
    already_connected: 'You are already connected.',
    already_pending: 'A request is already pending between you.',
    reverse_pending: 'They already sent you a request — answer it under Incoming.',
    target_unavailable: 'That listing is not available right now.',
    invalid_input: 'Please check the fields and try again.',
    unknown: 'Something went wrong. Please try again.',
  };
  const el: Record<ConnectionErrorCode, string> = {
    forbidden: 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.',
    not_pending: 'Αυτό το αίτημα έχει ήδη απαντηθεί.',
    already_connected: 'Είστε ήδη συνδεδεμένοι.',
    already_pending: 'Υπάρχει ήδη εκκρεμές αίτημα μεταξύ σας.',
    reverse_pending: 'Σας έχουν ήδη στείλει αίτημα — απαντήστε το στα Εισερχόμενα.',
    target_unavailable: 'Αυτή η καταχώριση δεν είναι διαθέσιμη αυτή τη στιγμή.',
    invalid_input: 'Ελέγξτε τα πεδία και δοκιμάστε ξανά.',
    unknown: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
  };
  return (locale === 'en' ? en : el)[code];
}

export interface PendingRequestLike {
  initiated_by: ConnectionInitiator;
  status: ConnectionRequestStatus;
}

export type PickerState = 'connected' | 'pending_out' | 'pending_in' | 'none';

/**
 * State of a hotel/business pair as seen from one side. "Connected" is
 * decided by the live partnership row only — an accepted request whose
 * partnership was later deactivated is not a connection.
 */
export function pickerState(
  partnership: { active: boolean } | null | undefined,
  request: PendingRequestLike | null | undefined,
  side: ConnectionInitiator,
): PickerState {
  if (partnership?.active) return 'connected';
  if (request && request.status === 'pending') {
    return request.initiated_by === side ? 'pending_out' : 'pending_in';
  }
  return 'none';
}

export function statusTone(status: ConnectionRequestStatus): PillTone {
  switch (status) {
    case 'pending':
      return 'warn';
    case 'accepted':
      return 'ok';
    case 'declined':
      return 'danger';
    default:
      return 'muted';
  }
}

export function statusLabel(status: ConnectionRequestStatus, locale: string): string {
  const en: Record<ConnectionRequestStatus, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    cancelled: 'Cancelled',
  };
  const el: Record<ConnectionRequestStatus, string> = {
    pending: 'Εκκρεμεί',
    accepted: 'Αποδεκτό',
    declined: 'Απορρίφθηκε',
    cancelled: 'Ακυρώθηκε',
  };
  return (locale === 'en' ? en : el)[status];
}

/** Who has to answer a request. */
export function counterpartyOf(initiatedBy: ConnectionInitiator): ConnectionInitiator {
  return initiatedBy === 'hotel' ? 'business' : 'hotel';
}

/** Format the commission the receiver would be accepting. */
export function formatCommission(pct: number | null | undefined, locale: string): string | null {
  if (pct == null) return null;
  const n = Number(pct);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return locale === 'en' ? `${text}% commission` : `${text}% προμήθεια`;
}

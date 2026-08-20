/** Redirect-based flash messages: ?saved=1 on success, ?error=<code> on failure. */

export type FlashErrorCode =
  | 'save_failed'
  | 'delete_failed'
  | 'invalid_input'
  | 'not_found'
  | 'forbidden'
  | 'unknown';

export const FLASH_ERROR_TEXT: Record<FlashErrorCode, { en: string; el: string }> = {
  save_failed: {
    en: 'The changes were not saved. Please try again.',
    el: 'Οι αλλαγές δεν αποθηκεύτηκαν. Δοκιμάστε ξανά.',
  },
  delete_failed: {
    en: 'The item was not deleted. Please try again.',
    el: 'Η εγγραφή δεν διαγράφηκε. Δοκιμάστε ξανά.',
  },
  invalid_input: {
    en: 'Some fields are invalid — nothing was saved.',
    el: 'Κάποια πεδία δεν είναι έγκυρα — δεν αποθηκεύτηκε τίποτα.',
  },
  not_found: {
    en: 'The record was not found. It may have been deleted.',
    el: 'Η εγγραφή δεν βρέθηκε. Ίσως έχει διαγραφεί.',
  },
  forbidden: {
    en: 'You do not have permission for this action — nothing was changed.',
    el: 'Δεν έχετε δικαίωμα για αυτή την ενέργεια — δεν άλλαξε τίποτα.',
  },
  unknown: {
    en: 'Something went wrong. Please try again.',
    el: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
  },
};

/** Append flash params to a path for redirect(). */
export function withFlash(path: string, ok: boolean, code?: FlashErrorCode): string {
  const sep = path.includes('?') ? '&' : '?';
  return ok ? `${path}${sep}saved=1` : `${path}${sep}error=${code ?? 'unknown'}`;
}

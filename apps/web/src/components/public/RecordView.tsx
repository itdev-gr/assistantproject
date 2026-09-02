'use client';

import { useEffect } from 'react';
import { recordRecentView } from '@/app/actions/user-library';

/**
 * Adds the business to the viewer's "recently viewed" list. Renders nothing
 * and silently ignores anonymous viewers, so the page itself stays cacheable.
 */
export function RecordView({ businessId }: { businessId: string }) {
  useEffect(() => {
    recordRecentView({ businessId }).catch(() => undefined);
  }, [businessId]);
  return null;
}

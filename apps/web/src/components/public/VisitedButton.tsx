'use client';

import { useEffect, useState, useTransition } from 'react';
import { MapPinCheck } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button, cn } from '@aga/ui';
import { getLibraryState, toggleVisited } from '@/app/actions/user-library';

interface Props {
  businessId: string;
  locale: string;
  className?: string;
}

/** "I've been here" toggle for the business detail page. */
export function VisitedButton({ businessId, locale, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<'unknown' | 'anonymous' | 'on' | 'off'>('unknown');
  const [pending, start] = useTransition();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  useEffect(() => {
    let cancelled = false;
    getLibraryState({ businessId })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setState(r.visited ? 'on' : 'off');
        else setState('anonymous');
      })
      .catch(() => !cancelled && setState('anonymous'));
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  function onClick() {
    if (state === 'anonymous') {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const prev = state;
    setState(prev === 'on' ? 'off' : 'on');
    start(async () => {
      const r = await toggleVisited({ businessId });
      if (r.ok) setState(r.visited ? 'on' : 'off');
      else {
        setState(prev);
        if (r.error === 'unauthenticated') {
          setState('anonymous');
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }
    });
  }

  const on = state === 'on';
  return (
    <Button
      type="button"
      variant={on ? 'default' : 'outline'}
      onClick={onClick}
      disabled={pending || state === 'unknown'}
      aria-pressed={on}
      className={cn(className)}
    >
      <MapPinCheck className="h-4 w-4" aria-hidden />
      {on ? t("I've been here", 'Έχω πάει') : t('Mark as visited', 'Σημείωση ως επίσκεψη')}
    </Button>
  );
}

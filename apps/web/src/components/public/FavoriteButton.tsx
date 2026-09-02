'use client';

import { useEffect, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button, cn } from '@aga/ui';
import { useUserLibrary } from '@/lib/user-library-store';
import { toggleFavorite } from '@/app/actions/user-library';

interface Props {
  businessId: string;
  locale: string;
  /** `card` = round icon over the photo; `detail` = labelled outline button. */
  variant?: 'card' | 'detail';
  className?: string;
}

export function FavoriteButton({ businessId, locale, variant = 'card', className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useUserLibrary((s) => s.status);
  const on = useUserLibrary((s) => s.favoriteIds.has(businessId));
  const load = useUserLibrary((s) => s.load);
  const setFavorite = useUserLibrary((s) => s.setFavorite);
  const markAnonymous = useUserLibrary((s) => s.markAnonymous);
  const [pending, start] = useTransition();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  useEffect(() => {
    void load();
  }, [load]);

  function goToLogin() {
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
  }

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'anonymous') {
      goToLogin();
      return;
    }
    const wasOn = on;
    setFavorite(businessId, !wasOn);
    start(async () => {
      const r = await toggleFavorite({ businessId });
      if (r.ok) {
        setFavorite(businessId, r.favorited);
        return;
      }
      setFavorite(businessId, wasOn);
      if (r.error === 'unauthenticated') {
        markAnonymous();
        goToLogin();
      }
    });
  }

  const label = on
    ? t('Remove from favourites', 'Αφαίρεση από αγαπημένα')
    : t('Save to favourites', 'Αποθήκευση στα αγαπημένα');

  if (variant === 'detail') {
    return (
      <Button
        type="button"
        variant={on ? 'default' : 'outline'}
        onClick={onClick}
        disabled={pending}
        aria-pressed={on}
        className={className}
      >
        <Heart className={cn('h-4 w-4', on && 'fill-current')} aria-hidden />
        {on ? t('Saved', 'Αποθηκευμένο') : t('Save', 'Αποθήκευση')}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        'bg-background/90 hover:bg-background grid h-8 w-8 place-items-center rounded-full shadow-sm transition-colors',
        on ? 'text-destructive' : 'text-muted-foreground hover:text-destructive',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', on && 'fill-current')} aria-hidden />
    </button>
  );
}

'use client';

import { useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { cn } from '@aga/ui';
import { ViewerMenu } from './ViewerMenu';

interface Props {
  locale: string;
  /** Transparent over the hero, turning solid after scrolling. */
  overlay?: boolean;
}

export function SiteHeader({ locale, overlay = false }: Props) {
  const otherLocale = locale === 'en' ? 'el' : 'en';
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 40));

  const transparent = overlay && !scrolled;

  return (
    <motion.header
      initial={false}
      className={cn(
        'top-0 z-30 transition-colors duration-300',
        overlay ? 'fixed inset-x-0' : 'bg-background/80 sticky border-b backdrop-blur',
        overlay &&
          (transparent
            ? 'border-b border-transparent bg-transparent'
            : 'border-border bg-background/80 border-b backdrop-blur'),
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 whitespace-nowrap text-base font-semibold transition-colors duration-300',
            transparent ? 'text-white' : 'text-foreground',
          )}
        >
          <img
            src={
              transparent ? '/brand/roomriv-horizontal-white.svg' : '/brand/roomriv-horizontal.svg'
            }
            alt="Roomriv"
            className="h-9 w-auto shrink-0"
          />
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={cn(
              'hidden rounded-md px-2 py-2 transition-colors duration-200 sm:block sm:px-3',
              transparent
                ? 'text-white/80 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {locale === 'en' ? 'Browse' : 'Περιήγηση'}
          </Link>
          <Link
            href="/about"
            className={cn(
              'rounded-md px-2 py-2 transition-colors duration-200 sm:px-3',
              transparent
                ? 'text-white/80 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {locale === 'en' ? 'About' : 'Σχετικά'}
          </Link>
          <a
            href={`/${otherLocale}`}
            className={cn(
              'rounded-md px-2 py-2 transition-colors duration-200 sm:px-3',
              transparent
                ? 'text-white/80 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="sm:hidden">{locale === 'en' ? 'ΕΛ' : 'EN'}</span>
            <span className="hidden sm:inline">{locale === 'en' ? 'Ελληνικά' : 'English'}</span>
          </a>
          <ViewerMenu locale={locale} transparent={transparent} />
        </nav>
      </div>
    </motion.header>
  );
}

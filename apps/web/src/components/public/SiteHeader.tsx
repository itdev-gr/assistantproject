'use client';

import { useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Waves } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button, cn } from '@aga/ui';

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
        overlay ? 'fixed inset-x-0' : 'sticky border-b bg-background/80 backdrop-blur',
        overlay &&
          (transparent
            ? 'border-b border-transparent bg-transparent'
            : 'border-b border-border bg-background/80 backdrop-blur'),
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
          <Waves className="h-5 w-5 shrink-0" aria-hidden />
          {locale === 'en' ? 'Local Guide' : 'Τοπικός Οδηγός'}
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
          <Button
            asChild
            size="sm"
            variant="outline"
            className={cn(
              'px-2 sm:px-3',
              transparent &&
                'border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white',
            )}
          >
            <Link href="/login">{locale === 'en' ? 'Sign in' : 'Είσοδος'}</Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}

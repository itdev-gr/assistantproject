'use client';

import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@aga/ui';
import { Heart, History, LayoutDashboard, MapPinCheck, Settings, type LucideIcon } from 'lucide-react';

interface Props {
  locale: string;
}

export function AccountNav({ locale }: Props) {
  const pathname = usePathname();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const items: { href: string; label: string; Icon: LucideIcon; exact?: boolean }[] = [
    { href: '/account', label: t('Overview', 'Επισκόπηση'), Icon: LayoutDashboard, exact: true },
    { href: '/account/favorites', label: t('Favourites', 'Αγαπημένα'), Icon: Heart },
    { href: '/account/visited', label: t("Where I've been", 'Πού έχω πάει'), Icon: MapPinCheck },
    { href: '/account/recent', label: t('Recently viewed', 'Πρόσφατα είδα'), Icon: History },
    { href: '/account/settings', label: t('Settings', 'Ρυθμίσεις'), Icon: Settings },
  ];
  return (
    <nav aria-label={t('Account', 'Λογαριασμός')} className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-primary/5',
            )}
          >
            <item.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

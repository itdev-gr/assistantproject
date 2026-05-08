'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { cn } from '@aga/ui';
import {
  Building2,
  HelpCircle,
  Sparkles,
  Clock,
  ScrollText,
  DoorOpen,
  Handshake,
  ListChecks,
  Receipt,
  Settings,
} from 'lucide-react';

const items = [
  { href: '/owner', key: 'dashboard', Icon: Building2 },
  { href: '/owner/property', key: 'property', Icon: Building2 },
  { href: '/owner/faqs', key: 'faqs', Icon: HelpCircle },
  { href: '/owner/amenities', key: 'amenities', Icon: Sparkles },
  { href: '/owner/hours', key: 'hours', Icon: Clock },
  { href: '/owner/policies', key: 'policies', Icon: ScrollText },
  { href: '/owner/rooms', key: 'rooms', Icon: DoorOpen },
  { href: '/owner/partners', key: 'partners', Icon: Handshake },
  { href: '/owner/referrals', key: 'referrals', Icon: ListChecks },
  { href: '/owner/bookings', key: 'bookings', Icon: Receipt },
  { href: '/owner/settings', key: 'settings', Icon: Settings },
] as const;

export function OwnerSidebar() {
  const pathname = usePathname();
  const t = useTranslations('owner.nav');
  return (
    <nav className="flex w-60 flex-col border-r bg-background p-4">
      <div className="mb-6 px-2 text-sm font-semibold">AI Guest Assistant</div>
      <ul className="space-y-1">
        {items.map(({ href, key, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

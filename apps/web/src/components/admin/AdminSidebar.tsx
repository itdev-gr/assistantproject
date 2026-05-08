'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { cn } from '@aga/ui';
import {
  Building2,
  Store,
  ListTree,
  Handshake,
  ShieldCheck,
  Sliders,
  Flag,
  BarChart3,
} from 'lucide-react';

const items = [
  { href: '/admin', key: 'tenants', Icon: Building2 },
  { href: '/admin/businesses', key: 'businesses', Icon: Store },
  { href: '/admin/categories', key: 'categories', Icon: ListTree },
  { href: '/admin/partnerships', key: 'partnerships', Icon: Handshake },
  { href: '/admin/moderation', key: 'moderation', Icon: ShieldCheck },
  { href: '/admin/rules', key: 'rules', Icon: Sliders },
  { href: '/admin/flags', key: 'flags', Icon: Flag },
  { href: '/admin/usage', key: 'usage', Icon: BarChart3 },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations('admin.nav');
  return (
    <nav className="flex w-60 flex-col border-r bg-background p-4">
      <div className="mb-6 px-2 text-sm font-semibold">Super Admin</div>
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

'use client';

import { useState, useTransition } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@aga/ui';
import { ExternalLink, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { signOut } from '@/app/actions/auth';

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Match only the exact path (for index routes like /admin). */
  exact?: boolean;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

interface Props {
  brand: string;
  tagline: string;
  groups: NavGroup[];
  email?: string | null;
  siteLabel: string;
  signOutLabel: string;
}

export function SidebarNav({ brand, tagline, groups, email, siteLabel, signOutLabel }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  const nav = (
    <>
      <div className="mb-6 px-3">
        <img src="/brand/roomriv-horizontal.svg" alt={brand} className="h-8 w-auto" />
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {tagline}
        </p>
      </div>
      {groups.map((group, gi) => (
        <div key={gi} className={cn(gi > 0 && 'mt-4')}>
          {group.heading ? (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.heading}
            </p>
          ) : (
            gi > 0 && <div className="mb-4 border-t" />
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-primary/5',
                    )}
                  >
                    <item.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-auto border-t pt-4">
        {email && (
          <p className="truncate px-3 pb-2 text-[12px] text-muted-foreground" title={email}>
            {email}
          </p>
        )}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-primary/5"
        >
          <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {siteLabel}
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {pending ? `${signOutLabel}…` : signOutLabel}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label={brand}
        className="hidden w-64 shrink-0 flex-col self-start border-r bg-card p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto"
      >
        {nav}
      </nav>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <img src="/brand/roomriv-horizontal.svg" alt={brand} className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={brand}
          aria-expanded={open}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-md text-primary hover:bg-primary/10"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!open}
      >
        <div
          className={cn(
            'absolute inset-0 bg-deep-ink/40 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            'absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-card p-4 shadow-xl transition-transform',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {nav}
        </div>
      </div>
    </>
  );
}

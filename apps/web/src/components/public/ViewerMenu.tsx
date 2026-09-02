'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@aga/db/browser';
import { Link } from '@/i18n/routing';
import { Button, cn } from '@aga/ui';
import { ChevronDown, LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { homeForRole, type AgaRole } from '@/lib/roles';

interface Viewer {
  role: AgaRole | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

interface Props {
  locale: string;
  /** Header is rendered over a dark hero image. */
  transparent?: boolean;
}

/**
 * Sign-in button / account dropdown. Public pages are ISR-cached, so the
 * signed-in state is resolved on the client after hydration.
 */
export function ViewerMenu({ locale, transparent = false }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getClaims();
        const claims = data?.claims as
          | { sub?: string; email?: string; aga_role?: AgaRole }
          | undefined;
        if (!claims?.sub) {
          if (!cancelled) setViewer(null);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', claims.sub)
          .maybeSingle();
        if (!cancelled) {
          setViewer({
            role: claims.aga_role ?? null,
            email: claims.email ?? null,
            name: profile?.display_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          });
        }
      } catch {
        if (!cancelled) setViewer(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!viewer) {
    return (
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
        <Link href="/login">{t('Sign in', 'Είσοδος')}</Link>
      </Button>
    );
  }

  const label = viewer.name || viewer.email || t('Account', 'Λογαριασμός');
  const initial = label.slice(0, 1).toUpperCase();
  const dashboard = viewer.role && viewer.role !== 'user' ? homeForRole(viewer.role) : null;
  const dashboardLabel =
    viewer.role === 'partner'
      ? t('Partner dashboard', 'Πίνακας συνεργάτη')
      : viewer.role === 'super_admin'
        ? t('Admin', 'Διαχείριση')
        : t('Hotel dashboard', 'Πίνακας ξενοδοχείου');

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 text-sm transition-colors',
          transparent
            ? 'border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
            : 'border-border bg-background hover:bg-muted',
        )}
      >
        <span className="bg-primary/15 text-primary grid h-7 w-7 place-items-center overflow-hidden rounded-full text-xs font-semibold">
          {viewer.avatarUrl ? (
            <img src={viewer.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{initial}</span>
          )}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{label}</span>
        <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="bg-card text-foreground absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-lg border p-1 text-sm shadow-lg"
        >
          <div className="text-muted-foreground truncate px-3 py-2 text-xs">{viewer.email}</div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="hover:bg-primary/5 flex items-center gap-2 rounded-md px-3 py-2"
          >
            <UserCircle className="h-4 w-4" aria-hidden />
            {t('My account', 'Ο λογαριασμός μου')}
          </Link>
          {dashboard && (
            <Link
              href={dashboard}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="hover:bg-primary/5 flex items-center gap-2 rounded-md px-3 py-2"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {dashboardLabel}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => start(() => signOut())}
            className="hover:bg-destructive/10 hover:text-destructive flex w-full items-center gap-2 rounded-md px-3 py-2 text-left disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t('Sign out', 'Αποσύνδεση')}
          </button>
        </div>
      )}
    </div>
  );
}

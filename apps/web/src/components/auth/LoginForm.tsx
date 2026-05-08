'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Button, Input, Label } from '@aga/ui';
import { sendMagicLink, signInWithPassword } from '@/app/actions/auth';

interface Props {
  next?: string;
  locale: string;
}

type Mode = 'password' | 'magic';

export function LoginForm({ next, locale }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    if (mode === 'password') {
      const result = await signInWithPassword({ email, password });
      setPending(false);
      if (result.ok) {
        router.push(next ?? '/owner');
        router.refresh();
      } else {
        setError(result.error);
      }
      return;
    }
    const result = await sendMagicLink({ email, next });
    setPending(false);
    if (result.ok) {
      const params = new URLSearchParams({ sent: '1' });
      if (next) params.set('next', next);
      router.replace(`/login?${params.toString()}`);
    } else {
      setError(result.error);
    }
  }

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={
            'rounded px-3 py-1.5 transition-colors ' +
            (mode === 'password'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          {t('Password', 'Κωδικός')}
        </button>
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={
            'rounded px-3 py-1.5 transition-colors ' +
            (mode === 'magic'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          {t('Magic link', 'Magic link')}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {mode === 'password' && (
          <div className="space-y-1.5">
            <Label htmlFor="password">{t('Password', 'Κωδικός')}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? t('Signing in…', 'Σύνδεση…')
            : mode === 'password'
              ? t('Sign in', 'Είσοδος')
              : t('Send magic link', 'Αποστολή συνδέσμου')}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("Don't have an account?", 'Δεν έχετε λογαριασμό;')}{' '}
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          {t('Sign up', 'Εγγραφή')}
        </Link>
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Button, Input, Label } from '@aga/ui';
import { signUpWithPassword } from '@/app/actions/auth';

interface Props {
  next?: string;
  locale: string;
}

export function SignupForm({ next, locale }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await signUpWithPassword({ email, password });
    setPending(false);
    if (result.ok) {
      router.push(next ?? '/');
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="space-y-4">
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
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('Password (min 6 chars)', 'Κωδικός (τουλάχιστον 6 χαρακτήρες)')}</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t('Creating…', 'Δημιουργία…') : t('Create account', 'Δημιουργία')}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('Already have an account?', 'Έχετε ήδη λογαριασμό;')}{' '}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          {t('Sign in', 'Είσοδος')}
        </Link>
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input, Label } from '@aga/ui';
import { sendMagicLink } from '@/app/actions/auth';

interface Props {
  next?: string;
  locale: string;
}

export function LoginForm({ next, locale }: Props) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
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

  return (
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
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? locale === 'en'
            ? 'Sending…'
            : 'Αποστολή…'
          : locale === 'en'
            ? 'Send magic link'
            : 'Αποστολή συνδέσμου'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

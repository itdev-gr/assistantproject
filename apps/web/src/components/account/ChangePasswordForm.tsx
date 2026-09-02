'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Label } from '@aga/ui';
import { changePassword } from '@/app/actions/auth';

interface Props {
  locale: string;
}

export function ChangePasswordForm({ locale }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage({ kind: 'error', text: t('Passwords do not match.', 'Οι κωδικοί δεν ταιριάζουν.') });
      return;
    }
    start(async () => {
      const r = await changePassword({ password });
      if (r.ok) {
        setPassword('');
        setConfirm('');
        setMessage({ kind: 'ok', text: t('Password updated.', 'Ο κωδικός ενημερώθηκε.') });
      } else {
        setMessage({ kind: 'error', text: r.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">{t('New password (min 8 chars)', 'Νέος κωδικός (τουλάχιστον 8)')}</Label>
        <Input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t('Confirm password', 'Επιβεβαίωση κωδικού')}</Label>
        <Input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {t('Update password', 'Ενημέρωση κωδικού')}
        </Button>
        {message && (
          <span className={message.kind === 'ok' ? 'text-sm text-olive' : 'text-sm text-destructive'}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

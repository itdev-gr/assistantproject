'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@aga/ui';
import { changePassword } from '@/app/actions/owner-settings';

interface Props {
  locale: string;
}

export function ChangePasswordForm({ locale }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("Passwords don't match", 'Οι κωδικοί δεν ταιριάζουν'));
      return;
    }
    if (password.length < 6) {
      setError(t('Min 6 characters', 'Τουλάχιστον 6 χαρακτήρες'));
      return;
    }
    setPending(true);
    const r = await changePassword({ password });
    setPending(false);
    if (r.ok) {
      setStatus('saved');
      setPassword('');
      setConfirm('');
    } else {
      setStatus('error');
      setError(r.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="new-pw">{t('New password', 'Νέος κωδικός')}</Label>
        <Input
          id="new-pw"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-pw">{t('Confirm password', 'Επιβεβαίωση κωδικού')}</Label>
        <Input
          id="confirm-pw"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t('Saving…', 'Αποθήκευση…') : t('Change password', 'Αλλαγή')}
        </Button>
        {status === 'saved' && (
          <span className="text-sm text-emerald-600">{t('Saved', 'Αποθηκεύτηκε')}</span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}

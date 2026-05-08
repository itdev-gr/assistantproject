'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input } from '@aga/ui';
import { inviteHotelUser } from '@/app/actions/admin-tenants';

interface Props {
  locale: string;
  hotelId: string;
}

export function InviteHotelUserForm({ locale, hotelId }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'manager' | 'staff'>('staff');
  const [error, setError] = useState<string | null>(null);

  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    start(async () => {
      const r = await inviteHotelUser({ hotelId, email, role });
      if (r.ok) {
        setEmail('');
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={invite} className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
      <Input
        type="email"
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as 'owner' | 'manager' | 'staff')}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="owner">owner</option>
        <option value="manager">manager</option>
        <option value="staff">staff</option>
      </select>
      <Button type="submit" disabled={pending || !email}>
        {locale === 'en' ? 'Invite' : 'Πρόσκληση'}
      </Button>
      {error && <p className="md:col-span-3 text-xs text-destructive">{error}</p>}
    </form>
  );
}

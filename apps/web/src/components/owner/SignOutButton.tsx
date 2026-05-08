'use client';

import { useTransition } from 'react';
import { Button } from '@aga/ui';
import { signOut } from '@/app/actions/auth';

interface Props {
  locale: string;
}

export function SignOutButton({ locale }: Props) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => signOut())}
    >
      {pending
        ? locale === 'en'
          ? 'Signing out…'
          : 'Αποσύνδεση…'
        : locale === 'en'
          ? 'Sign out'
          : 'Αποσύνδεση'}
    </Button>
  );
}

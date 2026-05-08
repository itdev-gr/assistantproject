'use client';

import { useTransition } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { deleteAmenity } from '@/app/actions/owner-amenities';

interface Props {
  id: string;
  editHref: string;
  locale: string;
}

export function AmenityRowActions({ id, editHref, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(locale === 'en' ? 'Delete?' : 'Διαγραφή;')) return;
    startTransition(async () => {
      await deleteAmenity({ id });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={editHref}>{locale === 'en' ? 'Edit' : 'Επεξεργασία'}</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
        {locale === 'en' ? 'Delete' : 'Διαγραφή'}
      </Button>
    </div>
  );
}

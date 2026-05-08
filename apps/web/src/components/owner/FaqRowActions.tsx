'use client';

import { useTransition } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { deleteFaq, setFaqPublished } from '@/app/actions/owner-faqs';

interface Props {
  id: string;
  published: boolean;
  editHref: string;
  locale: string;
}

export function FaqRowActions({ id, published, editHref, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function togglePublish() {
    startTransition(async () => {
      await setFaqPublished({ id, published: !published });
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm(locale === 'en' ? 'Delete this FAQ?' : 'Διαγραφή αυτής της ερώτησης;')) return;
    startTransition(async () => {
      await deleteFaq({ id });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild={false} variant="outline" size="sm" disabled={pending}>
        <Link href={editHref}>{locale === 'en' ? 'Edit' : 'Επεξεργασία'}</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={togglePublish} disabled={pending}>
        {published
          ? locale === 'en'
            ? 'Unpublish'
            : 'Απόσυρση'
          : locale === 'en'
            ? 'Publish'
            : 'Δημοσίευση'}
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
        {locale === 'en' ? 'Delete' : 'Διαγραφή'}
      </Button>
    </div>
  );
}

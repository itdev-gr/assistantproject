'use client';

import { useTransition } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { deleteFaq, setFaqPublished } from '@/app/actions/owner-faqs';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';

interface Props {
  id: string;
  published: boolean;
  editHref: string;
  locale: string;
}

export function FaqRowActions({ id, published, editHref, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  function togglePublish() {
    startTransition(async () => {
      await setFaqPublished({ id, published: !published });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" disabled={pending}>
        <Link href={editHref}>{t('Edit', 'Επεξεργασία')}</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={togglePublish} disabled={pending}>
        {published ? t('Unpublish', 'Απόσυρση') : t('Publish', 'Δημοσίευση')}
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm" disabled={pending}>
            {t('Delete', 'Διαγραφή')}
          </Button>
        }
        danger
        title={t('Delete this FAQ?', 'Διαγραφή αυτής της ερώτησης;')}
        description={t(
          'The question and its answer will be removed permanently. This cannot be undone.',
          'Η ερώτηση και η απάντησή της θα διαγραφούν οριστικά. Η ενέργεια δεν αναιρείται.',
        )}
        confirmLabel={t('Delete', 'Διαγραφή')}
        cancelLabel={t('Cancel', 'Άκυρο')}
        onConfirm={async () => {
          await deleteFaq({ id });
          router.refresh();
        }}
      />
    </div>
  );
}

'use client';

import { useRouter, Link } from '@/i18n/routing';
import { Button } from '@aga/ui';
import { deleteAmenity } from '@/app/actions/owner-amenities';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';

interface Props {
  id: string;
  editHref: string;
  locale: string;
}

export function AmenityRowActions({ id, editHref, locale }: Props) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={editHref}>{t('Edit', 'Επεξεργασία')}</Link>
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm">
            {t('Delete', 'Διαγραφή')}
          </Button>
        }
        danger
        title={t('Delete this amenity?', 'Διαγραφή αυτής της παροχής;')}
        description={t(
          'The amenity will be removed permanently. This cannot be undone.',
          'Η παροχή θα διαγραφεί οριστικά. Η ενέργεια δεν αναιρείται.',
        )}
        confirmLabel={t('Delete', 'Διαγραφή')}
        cancelLabel={t('Cancel', 'Άκυρο')}
        onConfirm={async () => {
          await deleteAmenity({ id });
          router.refresh();
        }}
      />
    </div>
  );
}

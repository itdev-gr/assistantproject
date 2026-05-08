'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@aga/ui';
import { decideModeration } from '@/app/actions/admin-moderation';

interface Props {
  kind: 'faq' | 'business';
  id: string;
  locale: string;
}

export function ModerationActions({ kind, id }: Props) {
  const router = useRouter();
  const t = useTranslations('admin.moderation');
  const [pending, start] = useTransition();

  function decide(approve: boolean) {
    start(async () => {
      await decideModeration({ kind, id, approve });
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" disabled={pending} onClick={() => decide(true)}>
        {t('approve')}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide(false)}>
        {t('reject')}
      </Button>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { LayoutDashboard, Store, UserCircle } from 'lucide-react';
import { SidebarNav } from '@/components/dashboard/SidebarNav';

interface Props {
  email?: string | null;
}

export function PartnerSidebar({ email }: Props) {
  const t = useTranslations('partner.nav');
  return (
    <SidebarNav
      brand={t('brand')}
      tagline={t('tagline')}
      email={email}
      siteLabel={t('site')}
      signOutLabel={t('signOut')}
      groups={[
        {
          heading: t('groupOverview'),
          items: [{ href: '/partner', label: t('dashboard'), Icon: LayoutDashboard, exact: true }],
        },
        {
          heading: t('groupBusiness'),
          items: [{ href: '/partner/business', label: t('business'), Icon: Store }],
        },
        {
          heading: t('groupAccount'),
          items: [{ href: '/account', label: t('account'), Icon: UserCircle }],
        },
      ]}
    />
  );
}

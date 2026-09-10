'use client';

import { useTranslations } from 'next-intl';
import { LayoutDashboard, Store, UserCircle, Handshake, CreditCard } from 'lucide-react';
import { SidebarNav } from '@/components/dashboard/SidebarNav';

interface Props {
  email?: string | null;
  /** Incoming hotel requests waiting for an answer. */
  pendingConnections?: number;
}

export function PartnerSidebar({ email, pendingConnections = 0 }: Props) {
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
          items: [
            { href: '/partner/business', label: t('business'), Icon: Store },
            { href: '/partner/connections', label: t('connections'), Icon: Handshake, badge: pendingConnections },
            { href: '/partner/billing', label: t('billing'), Icon: CreditCard },
          ],
        },
        {
          heading: t('groupAccount'),
          items: [{ href: '/account', label: t('account'), Icon: UserCircle }],
        },
      ]}
    />
  );
}

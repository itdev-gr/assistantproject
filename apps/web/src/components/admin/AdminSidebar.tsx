'use client';

import { useTranslations } from 'next-intl';
import {
  Building2,
  Store,
  ListTree,
  Handshake,
  ShieldCheck,
  Sliders,
  Flag,
  BarChart3,
} from 'lucide-react';
import { SidebarNav } from '@/components/dashboard/SidebarNav';

interface Props {
  email?: string | null;
}

export function AdminSidebar({ email }: Props) {
  const t = useTranslations('admin.nav');
  return (
    <SidebarNav
      brand={t('brand')}
      tagline={t('tagline')}
      email={email}
      siteLabel={t('site')}
      signOutLabel={t('signOut')}
      groups={[
        {
          heading: t('groupTenants'),
          items: [{ href: '/admin', label: t('tenants'), Icon: Building2, exact: true }],
        },
        {
          heading: t('groupCatalog'),
          items: [
            { href: '/admin/businesses', label: t('businesses'), Icon: Store },
            { href: '/admin/categories', label: t('categories'), Icon: ListTree },
            { href: '/admin/partnerships', label: t('partnerships'), Icon: Handshake },
          ],
        },
        {
          heading: t('groupQuality'),
          items: [
            { href: '/admin/moderation', label: t('moderation'), Icon: ShieldCheck },
            { href: '/admin/rules', label: t('rules'), Icon: Sliders },
            { href: '/admin/flags', label: t('flags'), Icon: Flag },
          ],
        },
        {
          heading: t('groupSystem'),
          items: [{ href: '/admin/usage', label: t('usage'), Icon: BarChart3 }],
        },
      ]}
    />
  );
}

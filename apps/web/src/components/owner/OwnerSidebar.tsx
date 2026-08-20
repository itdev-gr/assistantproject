'use client';

import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Building2,
  HelpCircle,
  Sparkles,
  Clock,
  ScrollText,
  DoorOpen,
  ListChecks,
  Receipt,
  CreditCard,
  Settings,
} from 'lucide-react';
import { SidebarNav } from '@/components/dashboard/SidebarNav';

interface Props {
  email?: string | null;
}

export function OwnerSidebar({ email }: Props) {
  const t = useTranslations('owner.nav');
  return (
    <SidebarNav
      brand={t('brand')}
      tagline={t('tagline')}
      email={email}
      siteLabel={t('site')}
      signOutLabel={t('logout')}
      groups={[
        {
          heading: t('groupOverview'),
          items: [{ href: '/owner', label: t('dashboard'), Icon: LayoutDashboard, exact: true }],
        },
        {
          heading: t('groupKnowledge'),
          items: [
            { href: '/owner/property', label: t('property'), Icon: Building2 },
            { href: '/owner/faqs', label: t('faqs'), Icon: HelpCircle },
            { href: '/owner/amenities', label: t('amenities'), Icon: Sparkles },
            { href: '/owner/hours', label: t('hours'), Icon: Clock },
            { href: '/owner/policies', label: t('policies'), Icon: ScrollText },
            { href: '/owner/rooms', label: t('rooms'), Icon: DoorOpen },
          ],
        },
        {
          heading: t('groupRevenue'),
          items: [
            { href: '/owner/referrals', label: t('referrals'), Icon: ListChecks },
            { href: '/owner/bookings', label: t('bookings'), Icon: Receipt },
            { href: '/owner/billing', label: t('billing'), Icon: CreditCard },
          ],
        },
        {
          heading: t('groupSettings'),
          items: [{ href: '/owner/settings', label: t('settings'), Icon: Settings }],
        },
      ]}
    />
  );
}

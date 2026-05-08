import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import elGuest from '@aga/i18n/messages/el/guest.json';
import elOwner from '@aga/i18n/messages/el/owner.json';
import elAdmin from '@aga/i18n/messages/el/admin.json';
import enGuest from '@aga/i18n/messages/en/guest.json';
import enOwner from '@aga/i18n/messages/en/owner.json';
import enAdmin from '@aga/i18n/messages/en/admin.json';

const BUNDLES = {
  el: { guest: elGuest, owner: elOwner, admin: elAdmin },
  en: { guest: enGuest, owner: enOwner, admin: enAdmin },
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'el' | 'en')) {
    locale = routing.defaultLocale;
  }
  return { locale, messages: BUNDLES[locale as 'el' | 'en'] };
});

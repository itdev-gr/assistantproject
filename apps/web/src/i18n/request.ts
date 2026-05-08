import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing.js';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'el' | 'en')) {
    locale = routing.defaultLocale;
  }
  const [guest, owner, admin] = await Promise.all([
    import(`@aga/i18n/messages/${locale}/guest.json`),
    import(`@aga/i18n/messages/${locale}/owner.json`),
    import(`@aga/i18n/messages/${locale}/admin.json`),
  ]);
  return {
    locale,
    messages: {
      guest: guest.default,
      owner: owner.default,
      admin: admin.default,
    },
  };
});

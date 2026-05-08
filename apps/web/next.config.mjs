import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@aga/api-contracts',
    '@aga/chat',
    '@aga/db',
    '@aga/i18n',
    '@aga/response-engine',
    '@aga/ui',
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(nextConfig);

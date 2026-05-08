import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: [
    '@aga/api-contracts',
    '@aga/chat',
    '@aga/db',
    '@aga/i18n',
    '@aga/response-engine',
    '@aga/ui',
  ],
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (business-images)
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  // Vercel sets this for us, but it's safer to be explicit so the workspace
  // build works in any CI.
  outputFileTracingRoot: process.env.VERCEL ? undefined : undefined,
};

export default withNextIntl(nextConfig);

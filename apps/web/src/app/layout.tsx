import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://assistantproject-web.vercel.app',
  ),
  title: 'AI Guest Assistant',
  description: 'Curated answers and recommendations for guests of partner hotels.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale and html lang are set by the [locale] segment layout. This root layout
  // is only used by /api routes and the marketing-free root.
  return children;
}

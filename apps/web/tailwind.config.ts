import type { Config } from 'tailwindcss';
import preset from '@aga/config/tailwind-preset';

const config: Config = {
  presets: [preset],
  content: [
    './src/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/chat/src/**/*.{ts,tsx}',
  ],
};
export default config;

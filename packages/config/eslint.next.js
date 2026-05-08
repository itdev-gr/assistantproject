import react from './eslint.react.js';

export default [
  ...react,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

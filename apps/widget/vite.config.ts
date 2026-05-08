import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';

const locale = process.env.AGA_LOCALE ?? 'el';

export default defineConfig({
  plugins: [preact()],
  define: {
    __AGA_LOCALE__: JSON.stringify(locale),
  },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    minify: 'esbuild',
    lib: {
      entry: fileURLToPath(new URL('./src/widget.tsx', import.meta.url)),
      formats: ['iife'],
      name: 'AGAWidget',
      fileName: () => `widget.${locale}.iife.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    outDir: `dist/${locale}`,
    emptyOutDir: true,
  },
});

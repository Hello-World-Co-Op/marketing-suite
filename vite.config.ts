import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite Configuration for Marketing Suite
 *
 * Build pipeline: tsc -> vite build -> prerender -> sitemap
 *
 * After `vite build` produces the SPA bundle in dist/, two post-build scripts run:
 * - scripts/prerender.ts: Generates static HTML for each route (/, /privacy-policy)
 *   using ReactDOMServer.renderToString(). This injects page content and SEO meta
 *   tags (via react-helmet-async) into each HTML file for crawlers.
 * - scripts/generate-sitemap.ts: Creates dist/sitemap.xml with all routes.
 *
 * The prerender script builds a separate SSR entry point (src/entry-prerender.tsx)
 * using Vite's SSR mode with its own config (no manualChunks, since SSR externalizes
 * node_modules). See scripts/prerender.ts for details.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  envPrefix: 'VITE_',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split large dependencies into separate chunks for better caching.
        // Note: These chunks are for the client-side SPA bundle only.
        // The SSR prerender build uses a separate Vite config without manualChunks.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
          form: ['react-hook-form', '@hookform/resolvers', 'zod', 'country-state-city'],
          dfinity: ['@dfinity/agent', '@dfinity/candid', '@dfinity/principal'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

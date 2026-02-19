/**
 * Pre-render Script
 *
 * Generates static HTML for each route by:
 * 1. Building the SSR entry point (entry-prerender.tsx) with Vite in SSR mode
 * 2. Loading the built module and calling render() for each route
 * 3. Injecting the rendered HTML + meta tags into the Vite-built index.html
 * 4. Writing route-specific HTML files (e.g., dist/privacy-policy/index.html)
 *
 * This runs after `vite build` and adds < 10s to the build.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { build } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const SSR_OUT = resolve(ROOT, '.ssr-temp');

async function prerender() {
  const startTime = Date.now();
  console.log('Pre-rendering: Building SSR bundle...');

  // 1. Build the SSR entry point
  // We pass configFile: false to avoid inheriting manualChunks from vite.config.ts,
  // which conflicts with SSR's automatic externalization of node_modules.
  await build({
    root: ROOT,
    configFile: false,
    plugins: [(await import('@vitejs/plugin-react')).default()],
    resolve: {
      alias: {
        '@': resolve(ROOT, 'src'),
      },
    },
    // Bundle react-helmet-async into the SSR output because its CJS exports
    // are not compatible with Node ESM dynamic import (only exposes .default).
    ssr: {
      noExternal: ['react-helmet-async'],
    },
    build: {
      ssr: true,
      outDir: SSR_OUT,
      rollupOptions: {
        input: resolve(ROOT, 'src/entry-prerender.tsx'),
      },
      sourcemap: false,
    },
    logLevel: 'warn',
  });

  // 2. Load the SSR module
  const { render, routes } = await import(resolve(SSR_OUT, 'entry-prerender.js'));

  // 3. Read the client-built index.html as template
  const template = readFileSync(resolve(DIST, 'index.html'), 'utf-8');

  // 4. Render each route and write to dist
  for (const route of routes) {
    console.log(`Pre-rendering: ${route}`);
    const { html, helmet } = render(route);

    // Validate that helmet data was collected (fail build if SEO tags missing)
    if (!helmet?.title || !helmet?.meta) {
      throw new Error(
        `Pre-render failed for ${route}: helmet data not collected. ` +
        'Ensure HelmetProvider wraps the app in entry-prerender.tsx.'
      );
    }

    // Inject helmet meta tags into <head> (before closing </head>)
    let page = template;
    if (helmet) {
      const headTags = [
        helmet.title?.toString() || '',
        helmet.meta?.toString() || '',
        helmet.link?.toString() || '',
      ]
        .filter(Boolean)
        .join('\n    ');

      if (headTags) {
        page = page.replace('</head>', `    ${headTags}\n  </head>`);
      }
    }

    // Inject rendered HTML into <div id="root">
    page = page.replace('<div id="root"></div>', `<div id="root">${html}</div>`);

    // Determine output path
    if (route === '/') {
      writeFileSync(resolve(DIST, 'index.html'), page, 'utf-8');
    } else {
      // e.g., /privacy-policy -> dist/privacy-policy/index.html
      const dir = resolve(DIST, route.slice(1));
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'index.html'), page, 'utf-8');
    }
  }

  // 5. Generate shell HTML for SPA-only routes (no pre-rendered content).
  // These routes don't need SEO pre-rendering but need their own index.html
  // so the IC canister doesn't serve the pre-rendered LaunchPage HTML, which
  // causes a React hydration mismatch and perceptible load delay.
  const shellRoutes = ['/signup', '/register', '/verify', '/link-identity', '/complete-profile', '/parental-consent-pending', '/consent'];
  for (const route of shellRoutes) {
    console.log(`Shell route: ${route}`);
    const dir = resolve(DIST, route.slice(1));
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'index.html'), template, 'utf-8');
  }

  // 6. Clean up SSR build artifacts
  if (existsSync(SSR_OUT)) {
    rmSync(SSR_OUT, { recursive: true });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Pre-rendering complete (${elapsed}s) - ${routes.length} routes, ${shellRoutes.length} shell routes`);
}

prerender().catch((err) => {
  console.error('Pre-render failed:', err);
  process.exit(1);
});

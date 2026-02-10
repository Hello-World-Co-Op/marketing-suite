/**
 * Sitemap Generator
 *
 * Generates sitemap.xml in the dist/ directory after Vite build.
 * Run as part of the build pipeline: `tsc && vite build && tsx scripts/generate-sitemap.ts`
 *
 * To add a new route:
 * 1. Add an entry to the `routes` array below
 * 2. Set appropriate priority (1.0 = homepage, 0.8 = important pages, 0.5 = secondary)
 * 3. Set changefreq based on how often the page content changes
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOSTNAME = 'https://www.helloworlddao.com';

interface SitemapRoute {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

const routes: SitemapRoute[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/privacy-policy', changefreq: 'monthly', priority: 0.5 },
];

// Note: lastmod is set to build date (not actual file modification date).
// This is acceptable for static sites where every build may update assets.
// For more accurate lastmod, consider querying git commit dates per file.
const today = new Date().toISOString().split('T')[0];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${HOSTNAME}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

const outPath = resolve(import.meta.dirname, '..', 'dist', 'sitemap.xml');
writeFileSync(outPath, sitemap, 'utf-8');
console.log(`Sitemap generated: ${outPath}`);

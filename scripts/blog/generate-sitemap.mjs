/**
 * Blog Sitemap Generator
 *
 * Generates a sitemap.xml that merges existing static routes with dynamic
 * blog post URLs. All published posts are included with lastmod timestamps
 * from the updated_at field.
 *
 * This script REPLACES the existing dist/sitemap.xml (which was generated
 * by scripts/generate-sitemap.ts during the build step). It includes the
 * same static routes plus all blog post URLs.
 *
 * Input: dist/blog-metadata.json (from fetch-metadata.mjs)
 * Output: dist/sitemap.xml (merged sitemap with static + blog routes)
 *
 * Story: BL-008.6.2 (Task 5)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const DIST = resolve(ROOT, 'dist');

const HOSTNAME = 'https://www.helloworlddao.com';

/**
 * Static routes from the marketing-suite build.
 * Mirrors scripts/generate-sitemap.ts to ensure consistency.
 */
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/privacy-policy', changefreq: 'monthly', priority: 0.5 },
  { path: '/blog', changefreq: 'daily', priority: 0.8 },
];

/**
 * Convert nanosecond IC timestamp to YYYY-MM-DD date string.
 *
 * @param {number|null} nanos - Nanosecond timestamp
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function nanosToDate(nanos) {
  if (!nanos) return new Date().toISOString().split('T')[0];
  return new Date(nanos / 1_000_000).toISOString().split('T')[0];
}

/**
 * Generate a merged sitemap XML string from static routes and blog posts.
 *
 * @param {Array} posts - Array of PostMetadata objects
 * @returns {string} Sitemap XML string
 */
export function generateSitemap(posts) {
  const today = new Date().toISOString().split('T')[0];

  // Static route entries
  const staticEntries = STATIC_ROUTES.map(
    (route) => `  <url>
    <loc>${HOSTNAME}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`
  );

  // Blog post entries (published only)
  const publishedPosts = posts.filter((p) => p.published_at !== null);
  const blogEntries = publishedPosts.map(
    (post) => `  <url>
    <loc>${HOSTNAME}/blog/${post.slug}</loc>
    <lastmod>${nanosToDate(post.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...blogEntries].join('\n')}
</urlset>
`;
}

/**
 * Main entry point — read metadata and generate merged sitemap.
 */
async function main() {
  const metadataPath = resolve(DIST, 'blog-metadata.json');
  let metadata;

  try {
    const raw = await readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${metadataPath}:`, err.message);
    process.exit(1);
  }

  const sitemap = generateSitemap(metadata);

  await mkdir(DIST, { recursive: true });
  const outPath = resolve(DIST, 'sitemap.xml');
  await writeFile(outPath, sitemap, 'utf-8');

  const publishedCount = metadata.filter((p) => p.published_at !== null).length;
  console.log(
    `Sitemap generated: ${outPath} (${STATIC_ROUTES.length} static + ${publishedCount} blog = ${STATIC_ROUTES.length + publishedCount} total URLs)`
  );
}

// Only run main when executed directly (not when imported by tests)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main();
}

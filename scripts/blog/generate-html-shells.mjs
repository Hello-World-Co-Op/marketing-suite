/**
 * Blog HTML Shell Generator
 *
 * Generates per-post HTML shell files at /blog/[slug]/index.html containing
 * SEO metadata in <head>: title, description, OG tags, canonical URL,
 * and Article JSON-LD structured data. The body contains an empty
 * <div id="root"></div> for Vite SPA hydration.
 *
 * Input: dist/blog-metadata.json (from fetch-metadata.mjs)
 * Output: dist/blog/[slug]/index.html for each published post
 *
 * Story: BL-008.6.2 (Task 3)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const DIST = resolve(ROOT, 'dist');

const HOSTNAME = 'https://www.helloworlddao.com';
const SITE_NAME = 'Hello World Co-Op';
const FALLBACK_OG_IMAGE = `${HOSTNAME}/og-image.png`;

/**
 * Escape HTML entities to prevent XSS in meta tag values.
 *
 * @param {string} str - Raw string
 * @returns {string} HTML-escaped string
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert nanosecond IC timestamp to ISO 8601 date string.
 *
 * @param {number|null} nanos - Nanosecond timestamp from IC canister
 * @returns {string} ISO 8601 date string or empty string if null
 */
export function nanosToIso(nanos) {
  if (!nanos) return '';
  // IC timestamps are in nanoseconds; JavaScript Date expects milliseconds
  return new Date(nanos / 1_000_000).toISOString();
}

/**
 * Generate Article JSON-LD structured data for a blog post.
 *
 * @param {object} post - PostMetadata object
 * @returns {string} JSON-LD script tag
 */
export function generateJsonLd(post) {
  const publishedDate = nanosToIso(post.published_at);
  const modifiedDate = nanosToIso(post.updated_at);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.og_image_url || post.featured_image_url || FALLBACK_OG_IMAGE,
    author: {
      '@type': 'Person',
      name: post.author_name,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${HOSTNAME}/og-image.png`,
      },
    },
    url: `${HOSTNAME}/blog/${post.slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${HOSTNAME}/blog/${post.slug}`,
    },
  };

  if (publishedDate) {
    jsonLd.datePublished = publishedDate;
  }
  if (modifiedDate) {
    jsonLd.dateModified = modifiedDate;
  }

  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

/**
 * Generate an HTML shell file for a single blog post.
 *
 * @param {object} post - PostMetadata object
 * @returns {string} Complete HTML document
 */
export function generateHtmlShell(post) {
  const title = escapeHtml(post.title);
  const description = escapeHtml(post.excerpt);
  const url = `${HOSTNAME}/blog/${post.slug}`;
  const ogImage = post.og_image_url || post.featured_image_url || FALLBACK_OG_IMAGE;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | ${SITE_NAME}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />

    <!-- Open Graph -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${SITE_NAME}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

    <!-- Article JSON-LD Structured Data -->
    ${generateJsonLd(post)}
  </head>
  <body>
    <div id="root"></div>
    <script>
      // SPA redirect: load the full application for client-side rendering
      if (!window.__PRERENDERED__) {
        window.location.replace('/blog/${post.slug}');
      }
    </script>
  </body>
</html>`;
}

/**
 * Main entry point — read metadata and generate HTML shells.
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

  // Filter to published posts only (those with a published_at timestamp)
  const publishedPosts = metadata.filter((p) => p.published_at !== null);

  if (publishedPosts.length === 0) {
    console.log('No published posts found — skipping HTML shell generation.');
    return;
  }

  console.log(`Generating HTML shells for ${publishedPosts.length} published posts...`);

  let count = 0;
  for (const post of publishedPosts) {
    const html = generateHtmlShell(post);
    const outDir = resolve(DIST, 'blog', post.slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(resolve(outDir, 'index.html'), html, 'utf-8');
    count++;
  }

  console.log(`HTML shells generated: ${count} files in dist/blog/`);
}

// Only run main when executed directly (not when imported by tests)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main();
}

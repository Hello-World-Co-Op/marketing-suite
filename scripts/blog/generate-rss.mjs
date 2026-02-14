/**
 * Blog RSS Feed Generator
 *
 * Generates an RSS 2.0 feed at dist/blog/rss.xml containing the last 20
 * published blog posts. HTML bodies in descriptions are XML-escaped.
 *
 * Input: dist/blog-metadata.json (from fetch-metadata.mjs)
 * Output: dist/blog/rss.xml
 *
 * Story: BL-008.6.2 (Task 4)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const DIST = resolve(ROOT, 'dist');

const HOSTNAME = 'https://www.helloworlddao.com';
const MAX_ITEMS = 20;

/**
 * Escape a string for safe inclusion in XML content.
 * Handles the 5 predefined XML entities.
 *
 * @param {string} str - Raw string
 * @returns {string} XML-safe string
 */
export function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert nanosecond IC timestamp to RFC 2822 date string (for RSS pubDate).
 *
 * @param {number|null} nanos - Nanosecond timestamp
 * @returns {string} RFC 2822 date string
 */
export function nanosToRfc2822(nanos) {
  if (!nanos) return '';
  return new Date(nanos / 1_000_000).toUTCString();
}

/**
 * Generate an RSS 2.0 XML feed from blog post metadata.
 *
 * @param {Array} posts - Array of PostMetadata objects (all posts)
 * @returns {string} RSS 2.0 XML string
 */
export function generateRssFeed(posts) {
  // Filter to published posts, sort by published_at descending, take first 20
  const publishedPosts = posts
    .filter((p) => p.published_at !== null)
    .sort((a, b) => b.published_at - a.published_at)
    .slice(0, MAX_ITEMS);

  const buildDate = new Date().toUTCString();

  const items = publishedPosts
    .map((post) => {
      const link = `${HOSTNAME}/blog/${post.slug}`;
      const pubDate = nanosToRfc2822(post.published_at);

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <author>${escapeXml(post.author_name)}</author>${
        post.categories.length > 0
          ? '\n' + post.categories.map((c) => `      <category>${escapeXml(c)}</category>`).join('\n')
          : ''
      }
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Hello World Co-Op Blog</title>
    <link>${HOSTNAME}/blog</link>
    <description>Updates, insights, and stories from the Hello World Co-Op DAO community.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${HOSTNAME}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

/**
 * Main entry point — read metadata and generate RSS feed.
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

  const rssXml = generateRssFeed(metadata);

  const outDir = resolve(DIST, 'blog');
  await mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, 'rss.xml');
  await writeFile(outPath, rssXml, 'utf-8');

  const publishedCount = metadata.filter((p) => p.published_at !== null).length;
  const itemCount = Math.min(publishedCount, MAX_ITEMS);
  console.log(`RSS feed generated: ${outPath} (${itemCount} items from ${publishedCount} published posts)`);
}

// Only run main when executed directly (not when imported by tests)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main();
}

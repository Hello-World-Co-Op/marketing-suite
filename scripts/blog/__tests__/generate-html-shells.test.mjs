// @vitest-environment node
/**
 * Unit tests for generate-html-shells.mjs
 *
 * Tests HTML shell generation including OG tags, canonical URL,
 * JSON-LD structured data, fallback OG image, and HTML escaping.
 *
 * Story: BL-008.6.2 (Task 3 tests)
 */

import { describe, it, expect } from 'vitest';
import { generateHtmlShell, generateJsonLd, escapeHtml, nanosToIso } from '../generate-html-shells.mjs';

const HOSTNAME = 'https://www.helloworlddao.com';
const FALLBACK_OG_IMAGE = `${HOSTNAME}/og-image.png`;

// Sample post metadata matching the blog canister PostMetadata struct
const samplePost = {
  id: 1,
  title: 'Getting Started with Web3',
  slug: 'getting-started-with-web3',
  excerpt: 'A beginner-friendly guide to Web3 and decentralized applications.',
  author_name: 'Alice Johnson',
  author_role: 'Admin',
  categories: ['Technology', 'Web3'],
  tags: ['web3', 'beginner', 'blockchain'],
  og_image_url: 'https://www.helloworlddao.com/images/web3-guide.png',
  featured_image_url: 'https://www.helloworlddao.com/images/web3-featured.png',
  published_at: 1700000000000000000, // nanoseconds
  updated_at: 1700100000000000000,
};

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });
});

describe('nanosToIso', () => {
  it('converts nanosecond timestamp to ISO 8601', () => {
    const result = nanosToIso(1700000000000000000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('returns empty string for null', () => {
    expect(nanosToIso(null)).toBe('');
    expect(nanosToIso(0)).toBe('');
  });
});

describe('generateJsonLd', () => {
  it('generates valid JSON-LD script tag', () => {
    const result = generateJsonLd(samplePost);
    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain('</script>');
  });

  it('contains Article type', () => {
    const result = generateJsonLd(samplePost);
    const jsonStr = result.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    const jsonLd = JSON.parse(jsonStr);

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd.headline).toBe(samplePost.title);
    expect(jsonLd.description).toBe(samplePost.excerpt);
  });

  it('includes author information', () => {
    const result = generateJsonLd(samplePost);
    const jsonStr = result.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    const jsonLd = JSON.parse(jsonStr);

    expect(jsonLd.author.name).toBe('Alice Johnson');
    expect(jsonLd.author['@type']).toBe('Person');
  });

  it('includes datePublished and dateModified', () => {
    const result = generateJsonLd(samplePost);
    const jsonStr = result.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    const jsonLd = JSON.parse(jsonStr);

    expect(jsonLd.datePublished).toBeDefined();
    expect(jsonLd.dateModified).toBeDefined();
  });

  it('uses custom OG image when available', () => {
    const result = generateJsonLd(samplePost);
    const jsonStr = result.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    const jsonLd = JSON.parse(jsonStr);

    expect(jsonLd.image).toBe(samplePost.og_image_url);
  });

  it('uses fallback image when no OG image', () => {
    const postNoImage = { ...samplePost, og_image_url: null, featured_image_url: null };
    const result = generateJsonLd(postNoImage);
    const jsonStr = result.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    const jsonLd = JSON.parse(jsonStr);

    expect(jsonLd.image).toBe(FALLBACK_OG_IMAGE);
  });
});

describe('generateHtmlShell', () => {
  it('generates valid HTML with doctype', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('contains title tag with post title and site name', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toContain('<title>Getting Started with Web3 | Hello World Co-Op</title>');
  });

  it('contains meta description', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toContain('<meta name="description" content="A beginner-friendly guide');
  });

  it('contains canonical URL', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toContain(
      `<link rel="canonical" href="${HOSTNAME}/blog/getting-started-with-web3" />`
    );
  });

  it('contains all required OG tags', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('og:image');
    expect(html).toContain('og:url');
    expect(html).toContain('og:type');
    expect(html).toContain('content="article"');
    expect(html).toContain('og:site_name');
  });

  it('contains Twitter Card meta tags', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toContain('twitter:card');
    expect(html).toContain('summary_large_image');
    expect(html).toContain('twitter:title');
    expect(html).toContain('twitter:description');
    expect(html).toContain('twitter:image');
  });

  it('contains JSON-LD structured data', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Article"');
  });

  it('contains <div id="root"></div> for SPA hydration', () => {
    const html = generateHtmlShell(samplePost);
    expect(html).toContain('<div id="root"></div>');
  });

  it('uses fallback OG image when post has no custom image (AC5)', () => {
    const postNoImage = { ...samplePost, og_image_url: null, featured_image_url: null };
    const html = generateHtmlShell(postNoImage);
    expect(html).toContain(`content="${FALLBACK_OG_IMAGE}"`);
  });

  it('uses featured_image_url as fallback before default image', () => {
    const postFeatured = { ...samplePost, og_image_url: null };
    const html = generateHtmlShell(postFeatured);
    expect(html).toContain(`content="${samplePost.featured_image_url}"`);
  });

  it('escapes HTML entities in title and description', () => {
    const postWithHtml = {
      ...samplePost,
      title: 'Test <b>bold</b> & "quotes"',
      excerpt: "It's a <em>world</em>",
    };
    const html = generateHtmlShell(postWithHtml);
    // Title tag should have escaped content
    expect(html).toContain('<title>Test &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quotes&quot; | Hello World Co-Op</title>');
    // Meta description should have escaped content
    expect(html).toContain('content="It&#39;s a &lt;em&gt;world&lt;/em&gt;"');
  });
});

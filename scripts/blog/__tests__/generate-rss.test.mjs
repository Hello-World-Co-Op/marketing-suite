// @vitest-environment node
/**
 * Unit tests for generate-rss.mjs
 *
 * Tests RSS 2.0 feed generation including XML structure, escaping,
 * post ordering, and the 20-item limit.
 *
 * Story: BL-008.6.2 (Task 4 tests)
 */

import { describe, it, expect } from 'vitest';
import { generateRssFeed, escapeXml, nanosToRfc2822 } from '../generate-rss.mjs';

const HOSTNAME = 'https://www.helloworlddao.com';

// Helper to create sample posts
function createPost(id, slug, title, publishedAtNanos) {
  return {
    id,
    title,
    slug,
    excerpt: `Excerpt for ${title}`,
    author_name: 'Test Author',
    author_role: 'Admin',
    categories: ['Tech'],
    tags: ['test'],
    og_image_url: null,
    featured_image_url: null,
    published_at: publishedAtNanos,
    updated_at: publishedAtNanos || Date.now() * 1_000_000,
  };
}

describe('escapeXml', () => {
  it('escapes XML special characters', () => {
    expect(escapeXml('<tag attr="val">')).toBe('&lt;tag attr=&quot;val&quot;&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeXml('A & B')).toBe('A &amp; B');
  });

  it('escapes apostrophes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });
});

describe('nanosToRfc2822', () => {
  it('converts nanosecond timestamp to RFC 2822 date', () => {
    const result = nanosToRfc2822(1700000000000000000);
    // RFC 2822 format: "Tue, 14 Nov 2023 22:13:20 GMT"
    expect(result).toMatch(/^\w{3}, \d{2} \w{3} \d{4}/);
    expect(result).toContain('GMT');
  });

  it('returns empty string for null', () => {
    expect(nanosToRfc2822(null)).toBe('');
    expect(nanosToRfc2822(0)).toBe('');
  });
});

describe('generateRssFeed', () => {
  it('generates valid RSS 2.0 XML', () => {
    const posts = [createPost(1, 'test-post', 'Test Post', 1700000000000000000)];
    const rss = generateRssFeed(posts);

    expect(rss).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(rss).toContain('<rss version="2.0"');
    expect(rss).toContain('</rss>');
  });

  it('contains channel metadata', () => {
    const posts = [createPost(1, 'test-post', 'Test Post', 1700000000000000000)];
    const rss = generateRssFeed(posts);

    expect(rss).toContain('<title>Hello World Co-Op Blog</title>');
    expect(rss).toContain(`<link>${HOSTNAME}/blog</link>`);
    expect(rss).toContain('<description>');
    expect(rss).toContain('<language>en-us</language>');
    expect(rss).toContain('<lastBuildDate>');
  });

  it('contains Atom self-link', () => {
    const posts = [createPost(1, 'test-post', 'Test Post', 1700000000000000000)];
    const rss = generateRssFeed(posts);

    expect(rss).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(rss).toContain(`atom:link href="${HOSTNAME}/blog/rss.xml"`);
  });

  it('generates correct item elements', () => {
    const posts = [createPost(1, 'test-post', 'Test Post', 1700000000000000000)];
    const rss = generateRssFeed(posts);

    expect(rss).toContain('<item>');
    expect(rss).toContain('<title>Test Post</title>');
    expect(rss).toContain(`<link>${HOSTNAME}/blog/test-post</link>`);
    expect(rss).toContain('<description>Excerpt for Test Post</description>');
    expect(rss).toContain('<pubDate>');
    expect(rss).toContain('<guid isPermaLink="true">');
    expect(rss).toContain('<author>Test Author</author>');
    expect(rss).toContain('<category>Tech</category>');
  });

  it('filters out unpublished posts', () => {
    const posts = [
      createPost(1, 'published', 'Published', 1700000000000000000),
      createPost(2, 'draft', 'Draft', null), // unpublished
    ];
    const rss = generateRssFeed(posts);

    expect(rss).toContain('Published');
    expect(rss).not.toContain('Draft');
  });

  it('sorts posts by published_at descending (newest first)', () => {
    const posts = [
      createPost(1, 'old', 'Old Post', 1600000000000000000),
      createPost(2, 'new', 'New Post', 1700000000000000000),
      createPost(3, 'mid', 'Mid Post', 1650000000000000000),
    ];
    const rss = generateRssFeed(posts);

    const newIdx = rss.indexOf('New Post');
    const midIdx = rss.indexOf('Mid Post');
    const oldIdx = rss.indexOf('Old Post');
    expect(newIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(oldIdx);
  });

  it('limits to 20 items maximum (AC3)', () => {
    const posts = [];
    for (let i = 0; i < 25; i++) {
      posts.push(createPost(i, `post-${i}`, `Post ${i}`, (1700000000000000000 + i * 1000000000000)));
    }
    const rss = generateRssFeed(posts);

    const itemCount = (rss.match(/<item>/g) || []).length;
    expect(itemCount).toBe(20);
  });

  it('XML-escapes HTML in descriptions (AC3)', () => {
    const post = createPost(1, 'test', 'Test', 1700000000000000000);
    post.excerpt = '<p>Hello & "World"</p>';
    const rss = generateRssFeed([post]);

    expect(rss).toContain('&lt;p&gt;Hello &amp; &quot;World&quot;&lt;/p&gt;');
    expect(rss).not.toContain('<p>Hello');
  });

  it('returns valid RSS with empty post list', () => {
    const rss = generateRssFeed([]);

    expect(rss).toContain('<?xml version="1.0"');
    expect(rss).toContain('<channel>');
    expect(rss).toContain('</channel>');
    expect(rss).not.toContain('<item>');
  });
});

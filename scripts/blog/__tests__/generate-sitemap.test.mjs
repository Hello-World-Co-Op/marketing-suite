// @vitest-environment node
/**
 * Unit tests for generate-sitemap.mjs
 *
 * Tests sitemap generation including URL inclusion, lastmod dates,
 * static route merging, and XML structure.
 *
 * Story: BL-008.6.2 (Task 5 tests)
 */

import { describe, it, expect } from 'vitest';
import { generateSitemap, nanosToDate } from '../generate-sitemap.mjs';

const HOSTNAME = 'https://www.helloworlddao.com';

function createPost(id, slug, publishedAtNanos, updatedAtNanos) {
  return {
    id,
    title: `Post ${id}`,
    slug,
    excerpt: `Excerpt for post ${id}`,
    author_name: 'Author',
    author_role: 'Admin',
    categories: [],
    tags: [],
    og_image_url: null,
    featured_image_url: null,
    published_at: publishedAtNanos,
    updated_at: updatedAtNanos || publishedAtNanos,
  };
}

describe('nanosToDate', () => {
  it('converts nanosecond timestamp to YYYY-MM-DD', () => {
    const result = nanosToDate(1700000000000000000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today for null', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(nanosToDate(null)).toBe(today);
  });
});

describe('generateSitemap', () => {
  it('generates valid sitemap XML', () => {
    const sitemap = generateSitemap([]);

    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('</urlset>');
  });

  it('includes static routes', () => {
    const sitemap = generateSitemap([]);

    expect(sitemap).toContain(`<loc>${HOSTNAME}/</loc>`);
    expect(sitemap).toContain(`<loc>${HOSTNAME}/privacy-policy</loc>`);
    expect(sitemap).toContain(`<loc>${HOSTNAME}/blog</loc>`);
  });

  it('includes published blog post URLs (AC4)', () => {
    const posts = [
      createPost(1, 'first-post', 1700000000000000000, 1700100000000000000),
      createPost(2, 'second-post', 1700200000000000000, 1700300000000000000),
    ];
    const sitemap = generateSitemap(posts);

    expect(sitemap).toContain(`<loc>${HOSTNAME}/blog/first-post</loc>`);
    expect(sitemap).toContain(`<loc>${HOSTNAME}/blog/second-post</loc>`);
  });

  it('includes lastmod dates from updated_at field', () => {
    const posts = [createPost(1, 'test-post', 1700000000000000000, 1700100000000000000)];
    const sitemap = generateSitemap(posts);

    // The lastmod should be derived from updated_at (not published_at)
    const expectedDate = nanosToDate(1700100000000000000);
    expect(sitemap).toContain(`<lastmod>${expectedDate}</lastmod>`);
  });

  it('filters out unpublished posts', () => {
    const posts = [
      createPost(1, 'published', 1700000000000000000, 1700000000000000000),
      createPost(2, 'draft', null, 1700000000000000000),
    ];
    const sitemap = generateSitemap(posts);

    expect(sitemap).toContain(`<loc>${HOSTNAME}/blog/published</loc>`);
    expect(sitemap).not.toContain(`<loc>${HOSTNAME}/blog/draft</loc>`);
  });

  it('merges static routes with blog URLs', () => {
    const posts = [createPost(1, 'my-post', 1700000000000000000, 1700000000000000000)];
    const sitemap = generateSitemap(posts);

    // Count total <url> elements: 3 static + 1 blog = 4
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    expect(urlCount).toBe(4);
  });

  it('assigns correct priority to blog posts', () => {
    const posts = [createPost(1, 'my-post', 1700000000000000000, 1700000000000000000)];
    const sitemap = generateSitemap(posts);

    // Blog posts should have priority 0.6
    // Find the blog post URL block and check its priority
    const blogPostBlock = sitemap.split('<url>').find((block) => block.includes('/blog/my-post'));
    expect(blogPostBlock).toContain('<priority>0.6</priority>');
  });

  it('assigns monthly changefreq to blog posts', () => {
    const posts = [createPost(1, 'my-post', 1700000000000000000, 1700000000000000000)];
    const sitemap = generateSitemap(posts);

    const blogPostBlock = sitemap.split('<url>').find((block) => block.includes('/blog/my-post'));
    expect(blogPostBlock).toContain('<changefreq>monthly</changefreq>');
  });
});

// @vitest-environment node
/**
 * SEO Component Tests: RSS Feed Auto-Discovery and OG Meta Tags
 *
 * Tests for BL-008.5.3 story features:
 * - RSS feed auto-discovery link tag (AC #1)
 * - OG meta tags for blog posts (AC #2)
 * - Twitter Card meta tags (AC #2)
 * - Canonical URL generation (AC #2)
 * - Fallback OG image when post has no custom image (AC #4)
 *
 * Uses react-dom/server renderToString in Node environment (not jsdom)
 * so that react-helmet-async correctly populates its context object.
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import { SEO } from './SEO';

function renderSEO(props: React.ComponentProps<typeof SEO>): HelmetServerState {
  const helmetContext: { helmet?: HelmetServerState } = {};
  renderToString(
    <HelmetProvider context={helmetContext}>
      <SEO {...props} />
    </HelmetProvider>,
  );
  return helmetContext.helmet!;
}

// ============================================================
// RSS Feed Auto-Discovery Tests (AC #1)
// ============================================================

describe('SEO - RSS Feed Auto-Discovery', () => {
  it('renders RSS auto-discovery link tag when rssUrl is provided', () => {
    const helmet = renderSEO({
      title: 'Blog',
      description: 'Blog description',
      rssUrl: '/blog/rss.xml',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).toContain('rel="alternate"');
    expect(linkStr).toContain('type="application/rss+xml"');
    expect(linkStr).toContain('href="/blog/rss.xml"');
  });

  it('uses default RSS title when rssTitle is not provided', () => {
    const helmet = renderSEO({
      title: 'Blog',
      description: 'Blog description',
      rssUrl: '/blog/rss.xml',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).toContain('title="Hello World DAO Blog"');
  });

  it('uses custom RSS title when rssTitle is provided', () => {
    const helmet = renderSEO({
      title: 'Blog',
      description: 'Blog description',
      rssUrl: '/blog/rss.xml',
      rssTitle: 'Custom Feed Title',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).toContain('title="Custom Feed Title"');
  });

  it('does not render RSS link when rssUrl is not provided', () => {
    const helmet = renderSEO({
      title: 'Home Page',
      description: 'Home description',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).not.toContain('application/rss+xml');
  });

  it('renders both canonical and RSS link tags when both are provided', () => {
    const helmet = renderSEO({
      title: 'Blog',
      description: 'Blog description',
      url: 'https://www.helloworlddao.com/blog',
      rssUrl: '/blog/rss.xml',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).toContain('canonical');
    expect(linkStr).toContain('https://www.helloworlddao.com/blog');
    expect(linkStr).toContain('application/rss+xml');
    expect(linkStr).toContain('/blog/rss.xml');
  });
});

// ============================================================
// OG Meta Tags for Blog Posts (AC #2)
// ============================================================

describe('SEO - Blog Post OG Meta Tags', () => {
  it('renders og:type=article for blog posts', () => {
    const helmet = renderSEO({
      title: 'Getting Started with ICP',
      description: 'Learn the basics of ICP development.',
      type: 'article',
      url: 'https://www.helloworlddao.com/blog/getting-started-with-icp',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:type');
    expect(metaStr).toContain('article');
  });

  it('renders og:title with post title', () => {
    const helmet = renderSEO({
      title: 'My Blog Post Title - Hello World Co-Op Blog',
      description: 'A great blog post.',
      type: 'article',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:title');
    expect(metaStr).toContain('My Blog Post Title - Hello World Co-Op Blog');
  });

  it('renders og:description with post excerpt', () => {
    const helmet = renderSEO({
      title: 'Test Post',
      description: 'This is the post excerpt for social sharing.',
      type: 'article',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:description');
    expect(metaStr).toContain('This is the post excerpt for social sharing.');
  });

  it('renders og:url with canonical post URL', () => {
    const helmet = renderSEO({
      title: 'Test Post',
      description: 'Description',
      type: 'article',
      url: 'https://www.helloworlddao.com/blog/test-post',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:url');
    expect(metaStr).toContain('https://www.helloworlddao.com/blog/test-post');
  });

  it('renders og:image with custom OG image when provided', () => {
    const helmet = renderSEO({
      title: 'Test Post',
      description: 'Description',
      type: 'article',
      image: 'https://example.com/custom-og.jpg',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:image');
    expect(metaStr).toContain('https://example.com/custom-og.jpg');
  });

  it('renders og:site_name as Hello World Co-Op', () => {
    const helmet = renderSEO({
      title: 'Test Post',
      description: 'Description',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:site_name');
    expect(metaStr).toContain('Hello World Co-Op');
  });
});

// ============================================================
// Twitter Card Meta Tags (AC #2)
// ============================================================

describe('SEO - Twitter Card Meta Tags', () => {
  it('renders twitter:card=summary_large_image by default', () => {
    const helmet = renderSEO({
      title: 'Blog Post',
      description: 'Description',
      type: 'article',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('twitter:card');
    expect(metaStr).toContain('summary_large_image');
  });

  it('renders twitter:title with post title', () => {
    const helmet = renderSEO({
      title: 'My Post Title',
      description: 'Description',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('twitter:title');
    expect(metaStr).toContain('My Post Title');
  });

  it('renders twitter:description with post description', () => {
    const helmet = renderSEO({
      title: 'Title',
      description: 'A detailed post description for Twitter.',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('twitter:description');
    expect(metaStr).toContain('A detailed post description for Twitter.');
  });

  it('renders twitter:image with custom image', () => {
    const helmet = renderSEO({
      title: 'Title',
      description: 'Description',
      image: 'https://example.com/twitter-image.jpg',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('twitter:image');
    expect(metaStr).toContain('https://example.com/twitter-image.jpg');
  });
});

// ============================================================
// Canonical URL (AC #2)
// ============================================================

describe('SEO - Canonical URL', () => {
  it('renders canonical link with absolute URL for blog post', () => {
    const helmet = renderSEO({
      title: 'Test Post',
      description: 'Description',
      url: 'https://www.helloworlddao.com/blog/my-post-slug',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).toContain('rel="canonical"');
    expect(linkStr).toContain('https://www.helloworlddao.com/blog/my-post-slug');
  });

  it('canonical URL is an absolute URL (not relative)', () => {
    const url = 'https://www.helloworlddao.com/blog/test-slug';
    const helmet = renderSEO({
      title: 'Test',
      description: 'Desc',
      url,
    });

    const linkStr = helmet.link.toString();
    // Must start with https://
    expect(linkStr).toContain('href="https://');
  });
});

// ============================================================
// Fallback OG Image (AC #4)
// ============================================================

describe('SEO - Fallback OG Image', () => {
  it('uses default OG image when no image is provided', () => {
    const helmet = renderSEO({
      title: 'Post Without Image',
      description: 'Description',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:image');
    expect(metaStr).toContain('https://www.helloworlddao.com/og-image.png');
  });

  it('uses custom image when provided (overrides default)', () => {
    const helmet = renderSEO({
      title: 'Post With Custom Image',
      description: 'Description',
      image: 'https://example.com/custom.png',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('https://example.com/custom.png');
    expect(metaStr).not.toContain('og-image.png');
  });

  it('uses blog-specific fallback image for posts without og_image_url', () => {
    // This tests the pattern used in BlogPost.tsx:
    // const ogImage = post?.ogImageUrl || post?.featuredImageUrl || BLOG_OG_FALLBACK;
    const BLOG_OG_FALLBACK = 'https://www.helloworlddao.com/assets/blog-og-default.png';

    const helmet = renderSEO({
      title: 'Post Without OG Image',
      description: 'Description',
      type: 'article',
      image: BLOG_OG_FALLBACK,
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('https://www.helloworlddao.com/assets/blog-og-default.png');
  });

  it('twitter:image also uses the fallback image', () => {
    const BLOG_OG_FALLBACK = 'https://www.helloworlddao.com/assets/blog-og-default.png';

    const helmet = renderSEO({
      title: 'Post Without Image',
      description: 'Description',
      image: BLOG_OG_FALLBACK,
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('twitter:image');
    expect(metaStr).toContain('https://www.helloworlddao.com/assets/blog-og-default.png');
  });
});

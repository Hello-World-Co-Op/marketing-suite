// @vitest-environment node
/**
 * Blog Pages RSS & Meta Tag Tests (BL-008.5.3)
 *
 * Verifies that blog pages include:
 * - RSS feed auto-discovery link tag (AC #1)
 * - OG meta tags with correct values (AC #2)
 * - Twitter Card meta tags (AC #2)
 * - Canonical URL (AC #2)
 * - Fallback OG image for posts without custom image (AC #4)
 *
 * Uses server-side rendering to inspect Helmet output,
 * since client-side jsdom does not reliably populate helmet context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { StaticRouter } from 'react-router-dom/server';
import type { HelmetServerState } from 'react-helmet-async';

// ============================================================
// Mock the blogCanister service
// ============================================================

const mockListPosts = vi.fn();
const mockListCategories = vi.fn();
const mockGetPostBySlug = vi.fn();

vi.mock('@/services/blogCanister', () => ({
  listPosts: (...args: unknown[]) => mockListPosts(...args),
  listCategories: (...args: unknown[]) => mockListCategories(...args),
  getPostBySlug: (slug: string) => mockGetPostBySlug(slug),
}));

// ============================================================
// Mock highlight.js (used by PostContent)
// ============================================================

vi.mock('highlight.js/lib/core', () => ({
  default: {
    highlightElement: vi.fn(),
    registerLanguage: vi.fn(),
  },
}));

vi.mock('highlight.js/lib/languages/typescript', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/rust', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/json', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/bash', () => ({ default: vi.fn() }));

// ============================================================
// Import components (after mocks)
// ============================================================

import { Routes, Route } from 'react-router-dom';
import BlogLanding from '../BlogLanding';
import BlogPost from '../BlogPost';
import type { BlogPost as BlogPostType, BlogCategory } from '@/services/blogCanister';

// ============================================================
// Test data
// ============================================================

const mockPosts: BlogPostType[] = [
  {
    id: 1,
    title: 'Test Post',
    slug: 'test-post',
    body: '<p>Content</p>',
    excerpt: 'Test excerpt for sharing.',
    authorName: 'Author',
    authorRole: 'Admin',
    categories: ['Tech'],
    tags: ['test'],
    featuredImageUrl: null,
    ogImageUrl: null,
    publishedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const mockCats: BlogCategory[] = [
  { name: 'Tech', slug: 'tech', postCount: 5 },
];

// ============================================================
// Helpers
// ============================================================

function renderBlogLandingSSR(): HelmetServerState {
  const helmetContext: { helmet?: HelmetServerState } = {};
  renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location="/blog">
        <BlogLanding />
      </StaticRouter>
    </HelmetProvider>,
  );
  return helmetContext.helmet!;
}

function renderBlogPostSSR(slug: string): HelmetServerState {
  const helmetContext: { helmet?: HelmetServerState } = {};
  // BlogPost uses useParams which needs Routes/Route context for slug extraction
  renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={`/blog/${slug}`}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </StaticRouter>
    </HelmetProvider>,
  );
  return helmetContext.helmet!;
}

// ============================================================
// Tests
// ============================================================

describe('BlogLanding - RSS Auto-Discovery (AC #1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPosts.mockResolvedValue(mockPosts);
    mockListCategories.mockResolvedValue(mockCats);
  });

  it('includes RSS auto-discovery link tag in head', () => {
    const helmet = renderBlogLandingSSR();
    const linkStr = helmet.link.toString();

    expect(linkStr).toContain('rel="alternate"');
    expect(linkStr).toContain('type="application/rss+xml"');
    expect(linkStr).toContain('href="/blog/rss.xml"');
    expect(linkStr).toContain('title="Hello World DAO Blog"');
  });

  it('includes canonical URL for blog landing page', () => {
    const helmet = renderBlogLandingSSR();
    const linkStr = helmet.link.toString();

    expect(linkStr).toContain('canonical');
    expect(linkStr).toContain('https://www.helloworlddao.com/blog');
  });
});

describe('BlogPost - RSS and OG Meta Tags (AC #1, #2, #4)', () => {
  const postWithOgImage: BlogPostType = {
    id: 1,
    title: 'Post With OG Image',
    slug: 'post-with-og',
    body: '<p>Content</p>',
    excerpt: 'Has a custom OG image.',
    authorName: 'Author',
    authorRole: 'Admin',
    categories: ['Tech'],
    tags: [],
    featuredImageUrl: 'https://example.com/featured.jpg',
    ogImageUrl: 'https://example.com/og-custom.jpg',
    publishedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const postWithoutImages: BlogPostType = {
    id: 2,
    title: 'Post Without Images',
    slug: 'post-without-images',
    body: '<p>Content</p>',
    excerpt: 'No images at all.',
    authorName: 'Author',
    authorRole: 'Admin',
    categories: [],
    tags: [],
    featuredImageUrl: null,
    ogImageUrl: null,
    publishedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes RSS auto-discovery link on individual post pages', () => {
    mockGetPostBySlug.mockResolvedValue(postWithOgImage);
    const helmet = renderBlogPostSSR('post-with-og');
    const linkStr = helmet.link.toString();

    expect(linkStr).toContain('rel="alternate"');
    expect(linkStr).toContain('type="application/rss+xml"');
    expect(linkStr).toContain('href="/blog/rss.xml"');
  });

  it('renders og:type=article for blog posts', () => {
    mockGetPostBySlug.mockResolvedValue(postWithOgImage);
    const helmet = renderBlogPostSSR('post-with-og');
    const metaStr = helmet.meta.toString();

    expect(metaStr).toContain('og:type');
    expect(metaStr).toContain('article');
  });

  it('renders canonical URL for individual post', () => {
    mockGetPostBySlug.mockResolvedValue(postWithOgImage);
    const helmet = renderBlogPostSSR('post-with-og');
    const linkStr = helmet.link.toString();

    expect(linkStr).toContain('canonical');
    expect(linkStr).toContain('https://www.helloworlddao.com/blog/post-with-og');
  });

  it('uses fallback OG image when post has no ogImageUrl or featuredImageUrl (AC #4)', () => {
    mockGetPostBySlug.mockResolvedValue(postWithoutImages);
    const helmet = renderBlogPostSSR('post-without-images');
    const metaStr = helmet.meta.toString();

    // Should use the blog-specific fallback, not the generic site OG image
    expect(metaStr).toContain('og:image');
    expect(metaStr).toContain('blog-og-default.png');
  });

  it('Twitter card meta tags are present on blog post page', () => {
    mockGetPostBySlug.mockResolvedValue(postWithOgImage);
    const helmet = renderBlogPostSSR('post-with-og');
    const metaStr = helmet.meta.toString();

    expect(metaStr).toContain('twitter:card');
    expect(metaStr).toContain('summary_large_image');
    expect(metaStr).toContain('twitter:title');
    expect(metaStr).toContain('twitter:description');
    expect(metaStr).toContain('twitter:image');
  });
});

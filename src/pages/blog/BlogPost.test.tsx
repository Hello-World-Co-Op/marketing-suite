import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import BlogPost from './BlogPost';
import type { BlogPost as BlogPostType } from '@/services/blogCanister';

// ============================================================
// Mock highlight.js (dynamically imported by PostContent)
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
// Mock the blogCanister service
// ============================================================

const mockGetPostBySlug = vi.fn<(slug: string) => Promise<BlogPostType>>();

vi.mock('@/services/blogCanister', () => ({
  getPostBySlug: (slug: string) => mockGetPostBySlug(slug),
}));

// ============================================================
// Test data
// ============================================================

const mockPost: BlogPostType = {
  id: 1,
  title: 'Getting Started with ICP',
  slug: 'getting-started-with-icp',
  body: '<h2>Introduction</h2><p>' + Array(400).fill('word').join(' ') + '</p>',
  excerpt: 'Learn how to build on the Internet Computer Protocol.',
  authorName: 'Alice Admin',
  authorRole: 'Admin',
  categories: ['Technology', 'Tutorials'],
  tags: ['icp', 'web3', 'rust'],
  featuredImageUrl: 'https://example.com/featured.jpg',
  ogImageUrl: 'https://example.com/og.jpg',
  publishedAt: new Date('2026-02-10T12:00:00Z').getTime(),
  createdAt: new Date('2026-02-09T12:00:00Z').getTime(),
  updatedAt: new Date('2026-02-10T12:00:00Z').getTime(),
};

function renderBlogPost(slug = 'getting-started-with-icp') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/blog/${slug}`]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/blog" element={<div>Blog Landing</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

/** Wait for post to finish loading by checking for the post title heading */
async function waitForPostLoaded() {
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Getting Started with ICP');
  });
}

// ============================================================
// Tests
// ============================================================

describe('BlogPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPostBySlug.mockResolvedValue(mockPost);
  });

  // --- Loading state ---

  it('renders loading skeleton while fetching', () => {
    mockGetPostBySlug.mockReturnValue(new Promise(() => {})); // hang
    renderBlogPost();
    expect(screen.getByTestId('post-skeleton')).toBeInTheDocument();
  });

  // --- Successful render ---

  it('renders post title as h1', async () => {
    renderBlogPost();
    await waitForPostLoaded();
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Getting Started with ICP');
  });

  it('fetches post by slug from URL params', async () => {
    renderBlogPost('getting-started-with-icp');
    await waitFor(() => {
      expect(mockGetPostBySlug).toHaveBeenCalledWith('getting-started-with-icp');
    });
  });

  it('renders author byline', async () => {
    renderBlogPost();
    await waitFor(() => {
      expect(screen.getByTestId('author-byline')).toBeInTheDocument();
    });
    expect(screen.getByTestId('author-name')).toHaveTextContent('Alice Admin');
    expect(screen.getByTestId('author-role')).toHaveTextContent('Admin');
  });

  it('renders reading time', async () => {
    renderBlogPost();
    await waitFor(() => {
      expect(screen.getByTestId('reading-time')).toBeInTheDocument();
    });
  });

  it('renders published date', async () => {
    renderBlogPost();
    await waitFor(() => {
      expect(screen.getByTestId('published-date')).toHaveTextContent('February 10, 2026');
    });
  });

  it('renders post content', async () => {
    renderBlogPost();
    await waitFor(() => {
      expect(screen.getByTestId('post-content')).toBeInTheDocument();
    });
  });

  it('renders featured image when present', async () => {
    renderBlogPost();
    await waitFor(() => {
      const img = screen.getByAltText('Featured image for Getting Started with ICP');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/featured.jpg');
    });
  });

  it('does not render featured image when absent', async () => {
    mockGetPostBySlug.mockResolvedValue({ ...mockPost, featuredImageUrl: null });
    renderBlogPost();
    await waitFor(() => {
      // Wait until content loads (check for author byline instead of title to avoid duplicate text issue)
      expect(screen.getByTestId('author-byline')).toBeInTheDocument();
    });
    expect(screen.queryByAltText(/Featured image/)).not.toBeInTheDocument();
  });

  it('renders category badges with links', async () => {
    renderBlogPost();
    await waitForPostLoaded();
    // Get the category link within the article (not in the collapsing header)
    const article = screen.getByRole('article');
    const techLink = article.querySelector('a[href="/blog?category=technology"]');
    expect(techLink).not.toBeNull();
    expect(techLink).toHaveTextContent('Technology');
  });

  it('renders tag badges with links', async () => {
    renderBlogPost();
    await waitForPostLoaded();
    expect(screen.getByText('#icp')).toBeInTheDocument();
    expect(screen.getByText('#web3')).toBeInTheDocument();
    expect(screen.getByText('#rust')).toBeInTheDocument();
  });

  // --- Error state ---

  it('renders 404 error when post not found', async () => {
    mockGetPostBySlug.mockRejectedValue(new Error('Blog post not found: NotFound'));
    renderBlogPost('nonexistent-slug');

    await waitFor(() => {
      expect(screen.getByTestId('post-error')).toBeInTheDocument();
      expect(screen.getByText('Post Not Found')).toBeInTheDocument();
    });
  });

  it('renders generic error for non-404 failures', async () => {
    mockGetPostBySlug.mockRejectedValue(new Error('Network error'));
    renderBlogPost();

    await waitFor(() => {
      expect(screen.getByTestId('post-error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  it('renders back to blog link in error state', async () => {
    mockGetPostBySlug.mockRejectedValue(new Error('Blog post not found: NotFound'));
    renderBlogPost('missing');

    await waitFor(() => {
      expect(screen.getByTestId('post-error')).toBeInTheDocument();
    });
    // The error state "Back to Blog" link
    const errorDiv = screen.getByTestId('post-error');
    const backLink = errorDiv.querySelector('a');
    expect(backLink).toHaveAttribute('href', '/blog');
    expect(backLink).toHaveTextContent('Back to Blog');
  });

  // --- Navigation ---

  it('renders back to blog breadcrumb link', async () => {
    renderBlogPost();
    await waitForPostLoaded();
    const breadcrumb = screen.getByLabelText('Breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    const backLink = breadcrumb.querySelector('a');
    expect(backLink).toHaveAttribute('href', '/blog');
  });

  // --- Suggest a correction ---

  it('renders suggest a correction mailto link', async () => {
    renderBlogPost();
    await waitFor(() => {
      const link = screen.getByTestId('suggest-correction');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href');
      expect(link.getAttribute('href')).toContain('mailto:hello@helloworlddao.com');
      expect(link.getAttribute('href')).toContain('Getting%20Started%20with%20ICP');
    });
  });

  // --- Accessibility ---

  it('has skip-to-content link', () => {
    renderBlogPost();
    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#post-content');
  });

  it('uses semantic article element', async () => {
    renderBlogPost();
    await waitForPostLoaded();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('uses semantic main element', async () => {
    renderBlogPost();
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('has proper heading hierarchy (h1 for title)', async () => {
    renderBlogPost();
    await waitForPostLoaded();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Getting Started with ICP');
  });

  // --- Collapsing header ---

  it('renders collapsing header element', async () => {
    renderBlogPost();
    await waitFor(() => {
      expect(screen.getByTestId('collapsing-header')).toBeInTheDocument();
    });
  });

  it('collapsing header starts hidden (not visible)', async () => {
    renderBlogPost();
    await waitFor(() => {
      const header = screen.getByTestId('collapsing-header');
      expect(header).toHaveClass('-translate-y-full');
    });
  });
});

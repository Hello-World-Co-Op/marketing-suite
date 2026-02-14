import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import BlogLanding from '../BlogLanding';
import type { BlogPost, BlogCategory } from '@/services/blogCanister';

// ============================================================
// Mock the blogCanister service
// ============================================================

const mockListPosts = vi.fn<() => Promise<BlogPost[]>>();
const mockListCategories = vi.fn<() => Promise<BlogCategory[]>>();

vi.mock('@/services/blogCanister', () => ({
  listPosts: (...args: unknown[]) => mockListPosts(...(args as [])),
  listCategories: (...args: unknown[]) => mockListCategories(...(args as [])),
}));

// ============================================================
// Test data
// ============================================================

const mockPosts: BlogPost[] = [
  {
    id: 1,
    title: 'Latest Post: DAO Governance Update',
    slug: 'dao-governance-update',
    body: Array(400).fill('word').join(' '),
    excerpt: 'The latest governance changes coming to Hello World Co-Op.',
    authorName: 'Alice Admin',
    authorRole: 'Admin',
    categories: ['Announcements'],
    tags: ['governance', 'update'],
    featuredImageUrl: 'https://example.com/hero.jpg',
    ogImageUrl: null,
    publishedAt: new Date('2026-02-10T12:00:00Z').getTime(),
    createdAt: new Date('2026-02-09T12:00:00Z').getTime(),
    updatedAt: new Date('2026-02-10T12:00:00Z').getTime(),
  },
  {
    id: 2,
    title: 'Understanding Tokenomics',
    slug: 'understanding-tokenomics',
    body: Array(200).fill('word').join(' '),
    excerpt: 'A deep dive into how token economics work.',
    authorName: 'Bob Writer',
    authorRole: 'Author',
    categories: ['Technology'],
    tags: ['tokenomics'],
    featuredImageUrl: null,
    ogImageUrl: null,
    publishedAt: new Date('2026-02-05T12:00:00Z').getTime(),
    createdAt: new Date('2026-02-04T12:00:00Z').getTime(),
    updatedAt: new Date('2026-02-05T12:00:00Z').getTime(),
  },
  {
    id: 3,
    title: 'Community Spotlight: February',
    slug: 'community-spotlight-february',
    body: Array(600).fill('word').join(' '),
    excerpt: 'Highlighting amazing community members this month.',
    authorName: 'Alice Admin',
    authorRole: 'Admin',
    categories: ['Announcements'],
    tags: ['community', 'governance'],
    featuredImageUrl: 'https://example.com/community.jpg',
    ogImageUrl: null,
    publishedAt: new Date('2026-02-01T12:00:00Z').getTime(),
    createdAt: new Date('2026-01-31T12:00:00Z').getTime(),
    updatedAt: new Date('2026-02-01T12:00:00Z').getTime(),
  },
];

const mockCategories: BlogCategory[] = [
  { name: 'Announcements', slug: 'announcements', postCount: 5 },
  { name: 'Technology', slug: 'technology', postCount: 4 },
  { name: 'Events', slug: 'events', postCount: 1 }, // Should be filtered out by CategoryPillBar
];

function renderBlogLanding(initialEntry = '/blog') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <BlogLanding />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

// ============================================================
// Tests
// ============================================================

describe('BlogLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPosts.mockResolvedValue(mockPosts);
    mockListCategories.mockResolvedValue(mockCategories);
  });

  it('renders loading state with skeleton elements', () => {
    // Make the promise hang
    mockListPosts.mockReturnValue(new Promise(() => {}));
    mockListCategories.mockReturnValue(new Promise(() => {}));

    renderBlogLanding();
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('grid-skeleton')).toBeInTheDocument();
  });

  it('renders hero with most recent post', async () => {
    renderBlogLanding();

    await waitFor(() => {
      expect(screen.getByText('Latest Post: DAO Governance Update')).toBeInTheDocument();
    });

    // Hero should have the tagline
    expect(
      screen.getByText('Insights from the Hello World Co-Op Community'),
    ).toBeInTheDocument();
  });

  it('renders post grid with remaining posts (not the hero post)', async () => {
    renderBlogLanding();

    await waitFor(() => {
      expect(screen.getByText('Understanding Tokenomics')).toBeInTheDocument();
      expect(screen.getByText('Community Spotlight: February')).toBeInTheDocument();
    });
  });

  it('renders category pills (excluding low-count categories)', async () => {
    renderBlogLanding();

    await waitFor(() => {
      expect(screen.getByText('All Posts')).toBeInTheDocument();
    });

    // Category pills have aria-pressed attribute; use that to distinguish from category badges
    const categoryNav = screen.getByLabelText('Blog categories');
    expect(categoryNav).toBeInTheDocument();

    // All Posts pill should be present
    const allPostsButton = screen.getByRole('button', { name: 'All Posts' });
    expect(allPostsButton).toHaveAttribute('aria-pressed', 'true');

    // Announcements and Technology pills should exist (postCount >= 3)
    const announcementsButton = screen.getByRole('button', { name: 'Announcements' });
    expect(announcementsButton).toBeInTheDocument();
    const techButton = screen.getByRole('button', { name: 'Technology' });
    expect(techButton).toBeInTheDocument();

    // Events has only 1 post, should be filtered out by CategoryPillBar
    expect(screen.queryByRole('button', { name: 'Events' })).not.toBeInTheDocument();
  });

  it('clicking category pill filters posts correctly', async () => {
    const user = userEvent.setup();
    renderBlogLanding();

    // Wait for content to load, then find the category pill button (not the span badges)
    let techPill: HTMLElement;
    await waitFor(() => {
      techPill = screen.getByRole('button', { name: 'Technology' });
      expect(techPill).toBeInTheDocument();
    });

    // Click the Technology category pill
    await user.click(techPill!);

    // When a category is active, there is no hero - all matching posts go to grid
    // Only "Understanding Tokenomics" should remain (it has Technology category)
    await waitFor(() => {
      expect(screen.getByText('Understanding Tokenomics')).toBeInTheDocument();
    });

    // The other Announcements-only posts should not be visible
    expect(screen.queryByText('Community Spotlight: February')).not.toBeInTheDocument();
  });

  it('renders error state with retry button', async () => {
    mockListPosts.mockRejectedValue(new Error('Network error'));

    renderBlogLanding();

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load blog posts. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('retry button refetches data', async () => {
    const user = userEvent.setup();
    mockListPosts.mockRejectedValueOnce(new Error('Network error'));

    renderBlogLanding();

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    // Now make the next call succeed
    mockListPosts.mockResolvedValueOnce(mockPosts);
    mockListCategories.mockResolvedValueOnce(mockCategories);

    await user.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Latest Post: DAO Governance Update')).toBeInTheDocument();
    });
  });

  it('renders SEO metadata', async () => {
    renderBlogLanding();
    await waitFor(() => {
      expect(screen.getByText('Blog')).toBeInTheDocument();
    });
    // SEO is rendered via Helmet, verify the heading
    expect(screen.getByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument();
  });

  it('renders empty state when no posts exist', async () => {
    mockListPosts.mockResolvedValue([]);

    renderBlogLanding();

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('No blog posts yet. Check back soon!')).toBeInTheDocument();
  });

  it('tag filter shows tag indicator with clear button', async () => {
    renderBlogLanding('/blog?tag=governance');

    await waitFor(() => {
      expect(screen.getByTestId('tag-filter-indicator')).toBeInTheDocument();
    });

    // The tag filter indicator section should contain the tag name and clear button
    const indicator = screen.getByTestId('tag-filter-indicator');
    expect(indicator).toHaveTextContent('#governance');
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });

  it('tag filter filters posts by tag', async () => {
    renderBlogLanding('/blog?tag=tokenomics');

    await waitFor(() => {
      expect(screen.getByText('Understanding Tokenomics')).toBeInTheDocument();
    });

    // Only the post with "tokenomics" tag should be visible
    // Note: when a tag is active, no hero is shown (active filter)
    expect(screen.queryByText('Community Spotlight: February')).not.toBeInTheDocument();
  });

  it('category filter via URL shows only matching posts', async () => {
    renderBlogLanding('/blog?category=announcements');

    await waitFor(() => {
      expect(screen.getByText('Latest Post: DAO Governance Update')).toBeInTheDocument();
      expect(screen.getByText('Community Spotlight: February')).toBeInTheDocument();
    });

    // Technology post should not appear
    expect(screen.queryByText('Understanding Tokenomics')).not.toBeInTheDocument();
  });
});

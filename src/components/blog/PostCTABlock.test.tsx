import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostCTABlock from './PostCTABlock';
import type { BlogPost } from '@/services/blogCanister';

// ============================================================
// Mock useRelatedPosts hook
// ============================================================

const mockUseRelatedPosts = vi.fn();

vi.mock('@/hooks/useRelatedPosts', () => ({
  useRelatedPosts: (...args: unknown[]) => mockUseRelatedPosts(...args),
}));

// ============================================================
// Mock clipboard for SocialShareButtons
// ============================================================

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

// ============================================================
// Test data
// ============================================================

function createPost(overrides: Partial<BlogPost> & { slug: string; id: number }): BlogPost {
  return {
    title: 'Test Post',
    body: '<p>Body</p>',
    excerpt: 'Excerpt',
    authorName: 'Author',
    authorRole: 'Admin',
    categories: ['Technology'],
    tags: ['test'],
    featuredImageUrl: null,
    ogImageUrl: null,
    publishedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

const relatedPosts: BlogPost[] = [
  createPost({ id: 2, slug: 'related-1', title: 'Related Post 1' }),
  createPost({ id: 3, slug: 'related-2', title: 'Related Post 2' }),
  createPost({ id: 4, slug: 'related-3', title: 'Related Post 3' }),
];

const defaultProps = {
  currentPostSlug: 'current-post',
  currentCategorySlug: 'technology',
  postTitle: 'Current Post Title',
  postUrl: 'https://www.helloworlddao.com/blog/current-post',
};

function renderPostCTABlock(props = defaultProps) {
  return render(
    <MemoryRouter>
      <PostCTABlock {...props} />
    </MemoryRouter>,
  );
}

// ============================================================
// Tests
// ============================================================

describe('PostCTABlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRelatedPosts.mockReturnValue({
      relatedPosts: relatedPosts,
      loading: false,
      error: null,
    });
  });

  it('renders the CTA block container', () => {
    renderPostCTABlock();
    expect(screen.getByTestId('post-cta-block')).toBeInTheDocument();
  });

  it('renders 3 related posts when category has enough posts', async () => {
    renderPostCTABlock();

    await waitFor(() => {
      expect(screen.getByTestId('related-posts-grid')).toBeInTheDocument();
    });

    const grid = screen.getByTestId('related-posts-grid');
    const cards = grid.querySelectorAll('article');
    expect(cards).toHaveLength(3);
  });

  it('renders "Continue Exploring" heading', () => {
    renderPostCTABlock();
    expect(screen.getByText('Continue Exploring')).toBeInTheDocument();
  });

  it('fills remaining slots with recent posts when category has < 3', () => {
    mockUseRelatedPosts.mockReturnValue({
      relatedPosts: [relatedPosts[0], relatedPosts[1]],
      loading: false,
      error: null,
    });

    renderPostCTABlock();

    const grid = screen.getByTestId('related-posts-grid');
    const cards = grid.querySelectorAll('article');
    expect(cards).toHaveLength(2);
  });

  it('"Join Hello World Co-Op" button links to /signup', () => {
    renderPostCTABlock();

    const joinButton = screen.getByTestId('join-dao-button');
    expect(joinButton).toBeInTheDocument();
    expect(joinButton).toHaveAttribute('href', '/signup');
    expect(joinButton).toHaveTextContent('Join Hello World Co-Op');
  });

  it('social share buttons present (Twitter, LinkedIn, copy)', () => {
    renderPostCTABlock();

    expect(screen.getByTestId('social-share-buttons')).toBeInTheDocument();
    expect(screen.getByTestId('share-twitter')).toBeInTheDocument();
    expect(screen.getByTestId('share-linkedin')).toBeInTheDocument();
    expect(screen.getByTestId('share-copy-link')).toBeInTheDocument();
  });

  it('renders responsive layout with proper grid classes', () => {
    renderPostCTABlock();

    const grid = screen.getByTestId('related-posts-grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('md:grid-cols-3');
  });

  it('shows loading skeleton when related posts are loading', () => {
    mockUseRelatedPosts.mockReturnValue({
      relatedPosts: [],
      loading: true,
      error: null,
    });

    renderPostCTABlock();

    expect(screen.getByTestId('related-posts-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('related-posts-grid')).not.toBeInTheDocument();
  });

  it('does not show related posts section when no related posts found', () => {
    mockUseRelatedPosts.mockReturnValue({
      relatedPosts: [],
      loading: false,
      error: null,
    });

    renderPostCTABlock();

    expect(screen.queryByTestId('related-posts-grid')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue Exploring')).not.toBeInTheDocument();
    // Join button and share buttons should still be present
    expect(screen.getByTestId('join-dao-button')).toBeInTheDocument();
    expect(screen.getByTestId('social-share-buttons')).toBeInTheDocument();
  });

  it('passes correct props to useRelatedPosts', () => {
    renderPostCTABlock();

    expect(mockUseRelatedPosts).toHaveBeenCalledWith('current-post', 'technology');
  });

  it('has accessible section landmark with label', () => {
    renderPostCTABlock();

    const section = screen.getByTestId('post-cta-block');
    expect(section.tagName).toBe('SECTION');
    expect(section).toHaveAttribute('aria-label', 'Continue exploring');
  });
});

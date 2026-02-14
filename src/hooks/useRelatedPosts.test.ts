import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRelatedPosts } from './useRelatedPosts';
import type { BlogPost } from '@/services/blogCanister';

// ============================================================
// Mock the blogCanister service
// ============================================================

const mockListPosts = vi.fn<() => Promise<BlogPost[]>>();

vi.mock('@/services/blogCanister', () => ({
  listPosts: () => mockListPosts(),
}));

// ============================================================
// Test data
// ============================================================

function createPost(overrides: Partial<BlogPost> & { slug: string }): BlogPost {
  return {
    id: 1,
    title: 'Default Post',
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

const currentPost = createPost({
  id: 1,
  slug: 'current-post',
  title: 'Current Post',
  categories: ['Technology'],
});

const techPost1 = createPost({
  id: 2,
  slug: 'tech-post-1',
  title: 'Tech Post 1',
  categories: ['Technology'],
  publishedAt: Date.now() - 1000,
});

const techPost2 = createPost({
  id: 3,
  slug: 'tech-post-2',
  title: 'Tech Post 2',
  categories: ['Technology'],
  publishedAt: Date.now() - 2000,
});

const techPost3 = createPost({
  id: 4,
  slug: 'tech-post-3',
  title: 'Tech Post 3',
  categories: ['Technology'],
  publishedAt: Date.now() - 3000,
});

const govPost1 = createPost({
  id: 5,
  slug: 'gov-post-1',
  title: 'Gov Post 1',
  categories: ['Governance'],
  publishedAt: Date.now() - 4000,
});

const govPost2 = createPost({
  id: 6,
  slug: 'gov-post-2',
  title: 'Gov Post 2',
  categories: ['Governance'],
  publishedAt: Date.now() - 5000,
});

// ============================================================
// Tests
// ============================================================

describe('useRelatedPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockListPosts.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.relatedPosts).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns 3 posts from same category when available', async () => {
    mockListPosts.mockResolvedValue([
      currentPost,
      techPost1,
      techPost2,
      techPost3,
      govPost1,
    ]);

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.relatedPosts).toHaveLength(3);
    expect(result.current.relatedPosts.map((p) => p.slug)).toEqual([
      'tech-post-1',
      'tech-post-2',
      'tech-post-3',
    ]);
    expect(result.current.error).toBeNull();
  });

  it('fills with recent posts when category has 0 posts', async () => {
    // Current post is "Technology", but only Governance posts available
    mockListPosts.mockResolvedValue([currentPost, govPost1, govPost2]);

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.relatedPosts).toHaveLength(2);
    expect(result.current.relatedPosts.map((p) => p.slug)).toEqual([
      'gov-post-1',
      'gov-post-2',
    ]);
  });

  it('fills with recent posts when category has 1-2 posts', async () => {
    mockListPosts.mockResolvedValue([
      currentPost,
      techPost1,
      govPost1,
      govPost2,
    ]);

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 1 tech post + 2 gov posts to fill to 3
    expect(result.current.relatedPosts).toHaveLength(3);
    expect(result.current.relatedPosts[0].slug).toBe('tech-post-1');
    // Remaining slots filled with recent posts from other categories
    expect(result.current.relatedPosts[1].slug).toBe('gov-post-1');
    expect(result.current.relatedPosts[2].slug).toBe('gov-post-2');
  });

  it('excludes current post from related posts list', async () => {
    mockListPosts.mockResolvedValue([
      currentPost,
      techPost1,
      techPost2,
      techPost3,
    ]);

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const slugs = result.current.relatedPosts.map((p) => p.slug);
    expect(slugs).not.toContain('current-post');
  });

  it('handles loading and error states', async () => {
    mockListPosts.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.relatedPosts).toEqual([]);
  });

  it('sets error when slug is undefined', async () => {
    const { result } = renderHook(() =>
      useRelatedPosts(undefined, 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('No post slug provided');
    expect(mockListPosts).not.toHaveBeenCalled();
  });

  it('handles non-Error exceptions', async () => {
    mockListPosts.mockRejectedValue('string error');

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load related posts');
  });

  it('handles no category gracefully by using recent posts', async () => {
    mockListPosts.mockResolvedValue([
      currentPost,
      techPost1,
      govPost1,
      govPost2,
    ]);

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', undefined),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Without a category, all other posts are used as fallback
    expect(result.current.relatedPosts).toHaveLength(3);
  });

  it('returns fewer than 3 when total posts are limited', async () => {
    mockListPosts.mockResolvedValue([currentPost, techPost1]);

    const { result } = renderHook(() =>
      useRelatedPosts('current-post', 'Technology'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.relatedPosts).toHaveLength(1);
    expect(result.current.relatedPosts[0].slug).toBe('tech-post-1');
  });
});

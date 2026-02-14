import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBlogPost } from './useBlogPost';
import type { BlogPost } from '@/services/blogCanister';

// ============================================================
// Mock the blogCanister service
// ============================================================

const mockGetPostBySlug = vi.fn<(slug: string) => Promise<BlogPost>>();

vi.mock('@/services/blogCanister', () => ({
  getPostBySlug: (slug: string) => mockGetPostBySlug(slug),
}));

// ============================================================
// Test data
// ============================================================

const mockPost: BlogPost = {
  id: 1,
  title: 'Test Post',
  slug: 'test-post',
  body: '<p>Test body content</p>',
  excerpt: 'Test excerpt',
  authorName: 'Author',
  authorRole: 'Admin',
  categories: ['Tech'],
  tags: ['test'],
  featuredImageUrl: null,
  ogImageUrl: null,
  publishedAt: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// ============================================================
// Tests
// ============================================================

describe('useBlogPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetPostBySlug.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useBlogPost('test-post'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches post by slug successfully', async () => {
    mockGetPostBySlug.mockResolvedValue(mockPost);
    const { result } = renderHook(() => useBlogPost('test-post'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPost);
    expect(result.current.error).toBeNull();
    expect(mockGetPostBySlug).toHaveBeenCalledWith('test-post');
  });

  it('handles error when post not found', async () => {
    mockGetPostBySlug.mockRejectedValue(new Error('Blog post not found: NotFound'));
    const { result } = renderHook(() => useBlogPost('missing-slug'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Blog post not found: NotFound');
  });

  it('handles generic error', async () => {
    mockGetPostBySlug.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useBlogPost('test-post'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('handles non-Error exceptions', async () => {
    mockGetPostBySlug.mockRejectedValue('string error');
    const { result } = renderHook(() => useBlogPost('test-post'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load post');
  });

  it('sets error when slug is undefined', async () => {
    const { result } = renderHook(() => useBlogPost(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('No slug provided');
    expect(mockGetPostBySlug).not.toHaveBeenCalled();
  });

  it('refetches when slug changes', async () => {
    mockGetPostBySlug.mockResolvedValue(mockPost);

    const { result, rerender } = renderHook(
      ({ slug }: { slug: string }) => useBlogPost(slug),
      { initialProps: { slug: 'post-1' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetPostBySlug).toHaveBeenCalledWith('post-1');

    const updatedPost = { ...mockPost, title: 'Updated Post', slug: 'post-2' };
    mockGetPostBySlug.mockResolvedValue(updatedPost);

    rerender({ slug: 'post-2' });

    await waitFor(() => {
      expect(result.current.data?.title).toBe('Updated Post');
    });

    expect(mockGetPostBySlug).toHaveBeenCalledWith('post-2');
  });
});

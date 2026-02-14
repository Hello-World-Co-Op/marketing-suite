/**
 * useRelatedPosts Hook
 *
 * Fetches related posts for a given blog post based on category matching.
 * Uses anonymous canister queries via @dfinity/agent (same pattern as useBlogPost).
 *
 * Related posts logic:
 * 1. Fetch all published posts via listPosts
 * 2. Filter to posts in the same category as the current post
 * 3. Exclude the current post (by slug comparison)
 * 4. If fewer than 3 category posts, fill remaining slots with most recent posts
 * 5. Deduplicate by slug, return first 3
 *
 * Returns { relatedPosts, loading, error } tuple following existing patterns.
 */

import { useState, useEffect } from 'react';
import { listPosts } from '@/services/blogCanister';
import type { BlogPost } from '@/services/blogCanister';

export interface UseRelatedPostsResult {
  relatedPosts: BlogPost[];
  loading: boolean;
  error: string | null;
}

const RELATED_POSTS_COUNT = 3;

export function useRelatedPosts(
  currentPostSlug: string | undefined,
  currentCategorySlug: string | undefined,
): UseRelatedPostsResult {
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPostSlug) {
      setLoading(false);
      setError('No post slug provided');
      return;
    }

    let cancelled = false;

    async function fetchRelatedPosts() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all published posts (sorted by publishedAt descending)
        const allPosts = await listPosts(1, 50);

        if (cancelled) return;

        // Filter out the current post
        const otherPosts = allPosts.filter((p) => p.slug !== currentPostSlug);

        // Find category matches (case-insensitive comparison)
        const categoryPosts = currentCategorySlug
          ? otherPosts.filter((p) =>
              p.categories.some(
                (c) => c.toLowerCase() === currentCategorySlug.toLowerCase(),
              ),
            )
          : [];

        // If we have enough category posts, use them
        if (categoryPosts.length >= RELATED_POSTS_COUNT) {
          setRelatedPosts(categoryPosts.slice(0, RELATED_POSTS_COUNT));
        } else {
          // Fill remaining slots with recent posts (deduplicate by slug)
          const categorySlugs = new Set(categoryPosts.map((p) => p.slug));
          const fillPosts = otherPosts.filter((p) => !categorySlugs.has(p.slug));
          const combined = [...categoryPosts, ...fillPosts];
          setRelatedPosts(combined.slice(0, RELATED_POSTS_COUNT));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load related posts';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRelatedPosts();

    return () => {
      cancelled = true;
    };
  }, [currentPostSlug, currentCategorySlug]);

  return { relatedPosts, loading, error };
}

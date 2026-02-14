/**
 * useBlogPost Hook
 *
 * Fetches a single blog post by slug from the blog canister.
 * Uses anonymous canister query via @dfinity/agent.
 *
 * Returns { data, loading, error } tuple following existing patterns.
 */

import { useState, useEffect } from 'react';
import { getPostBySlug } from '@/services/blogCanister';
import type { BlogPost } from '@/services/blogCanister';

export interface UseBlogPostResult {
  data: BlogPost | null;
  loading: boolean;
  error: string | null;
}

export function useBlogPost(slug: string | undefined): UseBlogPostResult {
  const [data, setData] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('No slug provided');
      return;
    }

    let cancelled = false;

    async function fetchPost() {
      setLoading(true);
      setError(null);
      try {
        const post = await getPostBySlug(slug!);
        if (!cancelled) {
          setData(post);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load post';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPost();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { data, loading, error };
}

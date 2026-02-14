/**
 * BlogLanding Page
 *
 * Main blog listing page at /blog with:
 * - BlogHero featuring the most recent post
 * - CategoryPillBar for category filtering
 * - PostCard grid with responsive layout
 * - Tag filtering via URL query params
 * - Loading skeletons (prevent CLS)
 * - Error state with retry
 * - SEO metadata via react-helmet-async
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO/SEO';
import BlogHero from '@/components/blog/BlogHero';
import CategoryPillBar from '@/components/blog/CategoryPillBar';
import PostCard from '@/components/blog/PostCard';
import { listPosts, listCategories } from '@/services/blogCanister';
import type { BlogPost, BlogCategory } from '@/services/blogCanister';

// ============================================================
// Skeleton components (prevent CLS per NFR8)
// ============================================================

function HeroSkeleton() {
  return (
    <div className="mb-12 animate-pulse" data-testid="hero-skeleton">
      <div className="h-5 w-64 bg-slate-700 rounded mx-auto mb-8" />
      <div className="bg-slate-800 rounded-2xl overflow-hidden">
        <div className="aspect-video bg-slate-700" />
        <div className="p-6 md:p-8">
          <div className="h-4 w-20 bg-slate-700 rounded-full mb-3" />
          <div className="h-8 w-3/4 bg-slate-700 rounded mb-3" />
          <div className="h-4 w-full bg-slate-700 rounded mb-2" />
          <div className="h-4 w-2/3 bg-slate-700 rounded mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700" />
            <div>
              <div className="h-3 w-24 bg-slate-700 rounded mb-1" />
              <div className="h-3 w-16 bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden animate-pulse" data-testid="card-skeleton">
      <div className="aspect-video bg-slate-700" />
      <div className="p-5">
        <div className="h-3 w-16 bg-slate-700 rounded-full mb-2" />
        <div className="h-5 w-3/4 bg-slate-700 rounded mb-2" />
        <div className="h-3 w-full bg-slate-700 rounded mb-1" />
        <div className="h-3 w-2/3 bg-slate-700 rounded mb-4" />
        <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
          <div className="w-7 h-7 rounded-full bg-slate-700" />
          <div>
            <div className="h-2.5 w-20 bg-slate-700 rounded mb-1" />
            <div className="h-2.5 w-14 bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="grid-skeleton">
      {[1, 2, 3, 4].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================================
// BlogLanding Page Component
// ============================================================

export default function BlogLanding() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read filter state from URL (normalize category to lowercase for case-insensitive matching)
  const activeCategory = searchParams.get('category')?.toLowerCase() || null;
  const activeTag = searchParams.get('tag');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPosts, fetchedCategories] = await Promise.all([
        listPosts(),
        listCategories(),
      ]);
      setPosts(fetchedPosts);
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('Failed to fetch blog data:', err);
      setError('Failed to load blog posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter posts by active category or tag
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeCategory) {
      result = result.filter((p) =>
        p.categories.some((c) => c.toLowerCase() === activeCategory.toLowerCase()),
      );
    }
    if (activeTag) {
      result = result.filter((p) =>
        p.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase()),
      );
    }
    return result;
  }, [posts, activeCategory, activeTag]);

  // Featured post is the first (most recent) post when no filter active
  const featuredPost = !activeCategory && !activeTag ? filteredPosts[0] : null;
  // Grid shows remaining posts (skip first if used as hero)
  const gridPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  const handleCategoryClick = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams();
      if (slug) {
        params.set('category', slug);
      }
      // Clear tag when selecting a category
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const handleTagClick = useCallback(
    (tag: string) => {
      const params = new URLSearchParams();
      params.set('tag', tag);
      // Clear category when selecting a tag
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const clearTagFilter = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-900">
      <SEO
        title="Blog - Hello World Co-Op DAO"
        description="Insights, updates, and stories from the Hello World Co-Op community"
        url="https://www.helloworlddao.com/blog"
        rssUrl="/blog/rss.xml"
        rssTitle="Hello World DAO Blog"
      />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-2">Blog</h1>

        {/* Loading state */}
        {loading && (
          <div data-testid="loading-state">
            <HeroSkeleton />
            <div className="mb-8 flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-24 bg-slate-700 rounded-full animate-pulse" />
              ))}
            </div>
            <GridSkeleton />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-16" data-testid="error-state">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content state */}
        {!loading && !error && (
          <>
            {/* Active tag indicator */}
            {activeTag && (
              <div className="flex items-center gap-2 mb-6 justify-center" data-testid="tag-filter-indicator">
                <span className="text-slate-400">
                  Showing posts tagged: <span className="text-white font-medium">#{activeTag}</span>
                </span>
                <button
                  onClick={clearTagFilter}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Hero - only show when no active filters and posts exist */}
            {featuredPost && <BlogHero featuredPost={featuredPost} />}

            {/* Category pill bar */}
            {categories.length > 0 && (
              <CategoryPillBar
                categories={categories}
                activeCategory={activeCategory}
                onCategoryClick={handleCategoryClick}
              />
            )}

            {/* Post grid */}
            {gridPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gridPosts.map((post) => (
                  <PostCard key={post.id} post={post} onTagClick={handleTagClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16" data-testid="empty-state">
                <p className="text-slate-400 text-lg">
                  {activeCategory || activeTag
                    ? 'No posts found matching your filter.'
                    : 'No blog posts yet. Check back soon!'}
                </p>
                {(activeCategory || activeTag) && (
                  <button
                    onClick={clearTagFilter}
                    className="mt-4 text-blue-400 hover:text-blue-300 underline"
                  >
                    View all posts
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

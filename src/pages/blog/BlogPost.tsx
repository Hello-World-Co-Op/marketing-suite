/**
 * BlogPost Page Component
 *
 * Individual blog post page at /blog/:slug with:
 * - Full post content with blog prose typography
 * - Author byline (avatar, name, role, date, reading time)
 * - Code highlighting via highlight.js
 * - Collapsing header on scroll (IntersectionObserver)
 * - "Suggest a correction" mailto link
 * - Loading skeleton for LCP < 2.0s target
 * - 404 error handling
 * - SEO metadata
 * - WCAG 2.1 Level AA compliance
 */

import { useRef, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '@/components/SEO/SEO';
import PostContent from '@/components/blog/PostContent';
import AuthorByline from '@/components/blog/AuthorByline';
import { useBlogPost } from '@/hooks/useBlogPost';

// ============================================================
// Loading Skeleton (prevent CLS per NFR8)
// ============================================================

function PostSkeleton() {
  return (
    <div className="animate-pulse" data-testid="post-skeleton">
      {/* Title skeleton */}
      <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="h-10 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-8" />

      {/* Author byline skeleton */}
      <div className="flex items-center gap-4 py-4 mb-8 border-b border-slate-300 dark:border-slate-700">
        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div>
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-3 w-48 bg-slate-300 dark:bg-slate-600 rounded" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 rounded mt-6" />
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

// ============================================================
// Error State
// ============================================================

function PostError({ message }: { message: string }) {
  const is404 = message.includes('NotFound') || message.includes('not found');

  return (
    <div className="text-center py-20" data-testid="post-error">
      <h1 className="text-4xl font-bold text-white mb-4">
        {is404 ? 'Post Not Found' : 'Something went wrong'}
      </h1>
      <p className="text-slate-400 text-lg mb-8">
        {is404
          ? "The blog post you're looking for doesn't exist or has been removed."
          : 'We had trouble loading this post. Please try again later.'}
      </p>
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Blog
      </Link>
    </div>
  );
}

// ============================================================
// Collapsing Header
// ============================================================

function CollapsingHeader({ title, visible }: { title: string; visible: boolean }) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      aria-hidden={!visible}
      data-testid="collapsing-header"
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <Link
          to="/blog"
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          tabIndex={visible ? 0 : -1}
        >
          &larr; Blog
        </Link>
        <h2 className="text-white font-semibold text-sm truncate mt-0.5">
          {title}
        </h2>
      </div>
    </header>
  );
}

// ============================================================
// Suggest Correction Link
// ============================================================

function SuggestCorrection({ title, slug }: { title: string; slug: string }) {
  const postUrl = `https://www.helloworlddao.com/blog/${slug}`;
  const subject = encodeURIComponent(`Correction for ${title}`);
  const body = encodeURIComponent(`Post URL: ${postUrl}\n\nMy suggestion:\n`);
  const mailto = `mailto:hello@helloworlddao.com?subject=${subject}&body=${body}`;

  return (
    <div className="border-t border-slate-700 pt-8 mt-12">
      <a
        href={mailto}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        data-testid="suggest-correction"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Suggest a correction
      </a>
    </div>
  );
}

// ============================================================
// Main BlogPost Page
// ============================================================

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, loading, error } = useBlogPost(slug);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  // Skip-to-content target
  const mainRef = useRef<HTMLElement>(null);

  // Collapsing header via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky header when sentinel is NOT intersecting (scrolled past)
        if (!cancelled) {
          setHeaderVisible(!entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );

    observer.observe(sentinelRef.current);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [post]);

  // Page title for SEO
  const pageTitle = post
    ? `${post.title} - Hello World Co-Op Blog`
    : 'Blog Post - Hello World Co-Op';
  const pageDescription = post?.excerpt || 'Read this blog post from the Hello World Co-Op community.';
  const pageUrl = slug ? `https://www.helloworlddao.com/blog/${slug}` : undefined;
  const ogImage = post?.ogImageUrl || post?.featuredImageUrl || undefined;

  return (
    <div className="min-h-screen bg-slate-900">
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        type="article"
        image={ogImage}
      />

      {/* Skip to content link for keyboard navigation */}
      <a
        href="#post-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to content
      </a>

      {/* Collapsing header - visible on scroll */}
      {post && <CollapsingHeader title={post.title} visible={headerVisible} />}

      <main ref={mainRef} id="post-content" className="max-w-4xl mx-auto px-4 py-12">
        {/* Sentinel element for IntersectionObserver */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* Back to blog link */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Blog
          </Link>
        </nav>

        {/* Loading state */}
        {loading && <PostSkeleton />}

        {/* Error state */}
        {error && !loading && <PostError message={error} />}

        {/* Post content */}
        {post && !loading && !error && (
          <article aria-labelledby="post-title">
            {/* Featured image */}
            {post.featuredImageUrl && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <img
                  src={post.featuredImageUrl}
                  alt={`Featured image for ${post.title}`}
                  className="w-full h-auto object-cover"
                  loading="eager"
                  width={1200}
                  height={675}
                />
              </div>
            )}

            {/* Post header */}
            <header className="mb-8">
              {/* Categories */}
              {post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.categories.map((cat) => (
                    <Link
                      key={cat}
                      to={`/blog?category=${encodeURIComponent(cat.toLowerCase())}`}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              )}

              <h1
                id="post-title"
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4"
              >
                {post.title}
              </h1>

              {/* Author byline */}
              <div className="border-b border-slate-700 pb-6">
                <AuthorByline
                  authorName={post.authorName}
                  authorRole={post.authorRole}
                  publishedAt={post.publishedAt}
                  body={post.body}
                />
              </div>
            </header>

            {/* Post body */}
            <PostContent html={post.body} />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-700">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="text-xs px-3 py-1 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Suggest a correction */}
            <SuggestCorrection title={post.title} slug={post.slug} />
          </article>
        )}
      </main>
    </div>
  );
}

/**
 * PostCTABlock Component
 *
 * Post-article CTA block displayed below blog post content with:
 * - Up to 3 related posts (same category first, then recent from any category)
 * - "Join Hello World Co-Op" button linking to /signup
 * - Social share buttons (Twitter, LinkedIn, copy link)
 *
 * Responsive layout:
 * - Mobile: single column, full-width buttons
 * - Desktop: 3-column grid for related posts, inline buttons
 *
 * Uses useRelatedPosts hook for data fetching and PostCard for display.
 */

import { Link } from 'react-router-dom';
import PostCard from '@/components/blog/PostCard';
import SocialShareButtons from '@/components/blog/SocialShareButtons';
import { useRelatedPosts } from '@/hooks/useRelatedPosts';

export interface PostCTABlockProps {
  currentPostSlug: string;
  currentCategorySlug: string | undefined;
  postTitle: string;
  postUrl: string;
}

export default function PostCTABlock({
  currentPostSlug,
  currentCategorySlug,
  postTitle,
  postUrl,
}: PostCTABlockProps) {
  const { relatedPosts, loading } = useRelatedPosts(currentPostSlug, currentCategorySlug);

  return (
    <section
      className="mt-12 pt-8 border-t border-slate-700"
      aria-label="Continue exploring"
      data-testid="post-cta-block"
    >
      {/* Related Posts Section */}
      {!loading && relatedPosts.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">Continue Exploring</h2>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            data-testid="related-posts-grid"
          >
            {relatedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton for related posts */}
      {loading && (
        <div
          className="mb-10"
          data-testid="related-posts-loading"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">Loading related posts...</span>
          <div className="h-8 w-48 bg-slate-700 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-slate-700" />
                <div className="p-5">
                  <div className="h-3 w-16 bg-slate-700 rounded-full mb-2" />
                  <div className="h-5 w-3/4 bg-slate-700 rounded mb-2" />
                  <div className="h-3 w-full bg-slate-700 rounded mb-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join CTA + Social Share */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Join the DAO button */}
        <Link
          to="/signup"
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 w-full sm:w-auto text-center"
          data-testid="join-dao-button"
        >
          Join Hello World Co-Op
        </Link>

        {/* Social share buttons */}
        <SocialShareButtons postTitle={postTitle} postUrl={postUrl} />
      </div>
    </section>
  );
}

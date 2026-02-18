/**
 * PostCard Component
 *
 * Displays a blog post summary in a card format for the post grid.
 *
 * Features:
 * - Title, excerpt, author byline, published date
 * - Calculated reading time (Math.ceil(wordCount / 200) minutes)
 * - Featured image with lazy loading and aspect ratio container
 * - Category badges (pill style)
 * - Clickable tags for tag filtering
 * - Link to /blog/{slug}
 * - Hover state with subtle shadow/transform
 * - Responsive: full-width mobile, card in grid on tablet+
 */

import { Link, useNavigate } from 'react-router-dom';
import type { BlogPost } from '@/services/blogCanister';

export interface PostCardProps {
  post: BlogPost;
  onTagClick?: (tag: string) => void;
}

/** Calculate reading time in minutes based on word count */
// eslint-disable-next-line react-refresh/only-export-components
export function calculateReadingTime(body: string): number {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PostCard({ post, onTagClick }: PostCardProps) {
  const navigate = useNavigate();
  const readingTime = calculateReadingTime(post.body);

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(tag);
    } else {
      navigate(`/blog?tag=${encodeURIComponent(tag)}`);
    }
  };

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block group"
      aria-label={`Read post: ${post.title}`}
    >
      <article className="bg-slate-800 rounded-xl overflow-hidden shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col">
        {post.featuredImageUrl && (
          <div className="aspect-video overflow-hidden">
            <img
              src={post.featuredImageUrl}
              alt={`Image for ${post.title}`}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              loading="lazy"
              width={600}
              height={338}
            />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          {/* Category badges */}
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.categories.map((cat) => (
                <span
                  key={cat}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
            {post.title}
          </h3>

          <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">
            {post.excerpt}
          </p>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => handleTagClick(e, tag)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  aria-label={`Filter by tag: ${tag}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Author byline and reading time */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold text-xs">
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">{post.authorName}</p>
                <p className="text-xs text-slate-500">{formatDate(post.publishedAt)}</p>
              </div>
            </div>
            <span className="text-xs text-slate-500">{readingTime} min read</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

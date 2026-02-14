/**
 * BlogHero Component
 *
 * Displays the most recent published blog post as a large featured card
 * at the top of the blog landing page.
 *
 * Features:
 * - Featured image (if available) with eager loading for LCP optimization
 * - Post title and excerpt
 * - Author byline with name and published date
 * - "Read More" link to individual post page
 * - Blog tagline
 * - Responsive: full-width on mobile, constrained on desktop
 */

import { Link } from 'react-router-dom';
import type { BlogPost } from '@/services/blogCanister';

export interface BlogHeroProps {
  featuredPost: BlogPost;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogHero({ featuredPost }: BlogHeroProps) {
  return (
    <section className="mb-12" aria-label="Featured post">
      <p className="text-center text-lg text-slate-400 mb-8">
        Insights from the Hello World Co-Op Community
      </p>

      <Link
        to={`/blog/${featuredPost.slug}`}
        className="block group"
        aria-label={`Read featured post: ${featuredPost.title}`}
      >
        <article className="bg-slate-800 rounded-2xl overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
          {featuredPost.featuredImageUrl && (
            <div className="aspect-video overflow-hidden">
              <img
                src={featuredPost.featuredImageUrl}
                alt={`Featured image for ${featuredPost.title}`}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                loading="eager"
                width={1200}
                height={675}
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Category badges */}
            {featuredPost.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {featuredPost.categories.map((cat) => (
                  <span
                    key={cat}
                    className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
              {featuredPost.title}
            </h2>

            <p className="text-slate-300 text-base md:text-lg mb-4 line-clamp-3">
              {featuredPost.excerpt}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Author avatar placeholder */}
                <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold text-sm">
                  {featuredPost.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{featuredPost.authorName}</p>
                  <p className="text-sm text-slate-400">{formatDate(featuredPost.publishedAt)}</p>
                </div>
              </div>

              <span className="text-blue-400 font-medium text-sm group-hover:underline">
                Read More &rarr;
              </span>
            </div>
          </div>
        </article>
      </Link>
    </section>
  );
}

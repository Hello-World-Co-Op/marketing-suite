/**
 * CategoryPillBar Component
 *
 * Horizontal scrollable category filter bar for the blog landing page.
 *
 * Features:
 * - "All Posts" pill for clearing filter
 * - Category pills with post counts
 * - Suppresses categories with fewer than 3 published posts (AC2)
 * - Active state highlighting
 * - Horizontal scroll on overflow
 * - Secondary color, 12-14px type
 */

import type { BlogCategory } from '@/services/blogCanister';

/** Minimum post count for a category to be visible to readers */
const MIN_POST_COUNT = 3;

export interface CategoryPillBarProps {
  categories: BlogCategory[];
  activeCategory: string | null;
  onCategoryClick: (slug: string | null) => void;
}

export default function CategoryPillBar({
  categories,
  activeCategory,
  onCategoryClick,
}: CategoryPillBarProps) {
  // Filter out categories with fewer than MIN_POST_COUNT posts
  const visibleCategories = categories.filter((cat) => cat.postCount >= MIN_POST_COUNT);

  return (
    <nav
      className="mb-8 overflow-x-auto scrollbar-hide"
      aria-label="Blog categories"
    >
      <div className="flex gap-2 pb-2 min-w-max">
        {/* "All Posts" pill */}
        <button
          onClick={() => onCategoryClick(null)}
          className={`
            px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap
            ${
              activeCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }
          `}
          aria-pressed={activeCategory === null}
        >
          All Posts
        </button>

        {visibleCategories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => onCategoryClick(cat.slug)}
            className={`
              px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap
              ${
                activeCategory === cat.slug
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }
            `}
            aria-pressed={activeCategory === cat.slug}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
}

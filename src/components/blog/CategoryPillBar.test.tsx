import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryPillBar from './CategoryPillBar';
import type { BlogCategory } from '@/services/blogCanister';

const mockCategories: BlogCategory[] = [
  { name: 'Announcements', slug: 'announcements', postCount: 5 },
  { name: 'Technology', slug: 'technology', postCount: 8 },
  { name: 'Community', slug: 'community', postCount: 3 },
  { name: 'Events', slug: 'events', postCount: 2 },  // Should be filtered out (< 3)
  { name: 'Governance', slug: 'governance', postCount: 1 }, // Should be filtered out (< 3)
];

describe('CategoryPillBar', () => {
  it('renders all categories with >= 3 posts', () => {
    render(
      <CategoryPillBar
        categories={mockCategories}
        activeCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );

    expect(screen.getByText('All Posts')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('filters out categories with < 3 posts', () => {
    render(
      <CategoryPillBar
        categories={mockCategories}
        activeCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );

    expect(screen.queryByText('Events')).not.toBeInTheDocument();
    expect(screen.queryByText('Governance')).not.toBeInTheDocument();
  });

  it('highlights active category', () => {
    render(
      <CategoryPillBar
        categories={mockCategories}
        activeCategory="technology"
        onCategoryClick={vi.fn()}
      />,
    );

    const techButton = screen.getByText('Technology');
    expect(techButton).toHaveAttribute('aria-pressed', 'true');

    const allButton = screen.getByText('All Posts');
    expect(allButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking pill calls onCategoryClick with correct slug', async () => {
    const user = userEvent.setup();
    const onCategoryClick = vi.fn();

    render(
      <CategoryPillBar
        categories={mockCategories}
        activeCategory={null}
        onCategoryClick={onCategoryClick}
      />,
    );

    await user.click(screen.getByText('Technology'));
    expect(onCategoryClick).toHaveBeenCalledWith('technology');
  });

  it('"All Posts" pill clears filter by calling onCategoryClick with null', async () => {
    const user = userEvent.setup();
    const onCategoryClick = vi.fn();

    render(
      <CategoryPillBar
        categories={mockCategories}
        activeCategory="technology"
        onCategoryClick={onCategoryClick}
      />,
    );

    await user.click(screen.getByText('All Posts'));
    expect(onCategoryClick).toHaveBeenCalledWith(null);
  });

  it('renders with proper navigation aria label', () => {
    render(
      <CategoryPillBar
        categories={mockCategories}
        activeCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Blog categories')).toBeInTheDocument();
  });

  it('handles empty categories array', () => {
    render(
      <CategoryPillBar
        categories={[]}
        activeCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );

    // Only "All Posts" should be visible
    expect(screen.getByText('All Posts')).toBeInTheDocument();
  });
});

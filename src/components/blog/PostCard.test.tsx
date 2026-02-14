import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PostCard, { calculateReadingTime } from './PostCard';
import type { BlogPost } from '@/services/blogCanister';

const mockPost: BlogPost = {
  id: 2,
  title: 'Understanding Tokenomics',
  slug: 'understanding-tokenomics',
  body: Array(200).fill('word').join(' '), // Exactly 200 words = 1 min read
  excerpt: 'A deep dive into how token economics work in the Hello World Co-Op.',
  authorName: 'Bob Smith',
  authorRole: 'Author',
  categories: ['Technology', 'Governance'],
  tags: ['tokenomics', 'dao'],
  featuredImageUrl: 'https://example.com/tokenomics.jpg',
  ogImageUrl: null,
  publishedAt: new Date('2026-02-01T12:00:00Z').getTime(),
  createdAt: new Date('2026-01-30T12:00:00Z').getTime(),
  updatedAt: new Date('2026-02-01T12:00:00Z').getTime(),
};

function renderPostCard(post: BlogPost = mockPost, onTagClick?: (tag: string) => void) {
  return render(
    <MemoryRouter>
      <PostCard post={post} onTagClick={onTagClick} />
    </MemoryRouter>,
  );
}

describe('calculateReadingTime', () => {
  it('returns 1 min for 200 words', () => {
    const body = Array(200).fill('word').join(' ');
    expect(calculateReadingTime(body)).toBe(1);
  });

  it('returns 2 min for 201-400 words', () => {
    const body = Array(250).fill('word').join(' ');
    expect(calculateReadingTime(body)).toBe(2);
  });

  it('returns at least 1 min for very short content', () => {
    expect(calculateReadingTime('short')).toBe(1);
    expect(calculateReadingTime('')).toBe(1);
  });

  it('handles long content correctly', () => {
    const body = Array(1000).fill('word').join(' ');
    expect(calculateReadingTime(body)).toBe(5);
  });
});

describe('PostCard', () => {
  it('renders post title, excerpt, author, and date', () => {
    renderPostCard();
    expect(screen.getByText(mockPost.title)).toBeInTheDocument();
    expect(screen.getByText(mockPost.excerpt)).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Feb 1, 2026')).toBeInTheDocument();
  });

  it('calculates and displays reading time', () => {
    renderPostCard();
    expect(screen.getByText('1 min read')).toBeInTheDocument();
  });

  it('renders featured image when present', () => {
    renderPostCard();
    const img = screen.getByAltText(`Image for ${mockPost.title}`);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockPost.featuredImageUrl);
    // Post card images should use lazy loading (below fold)
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('does not render image when not present', () => {
    const postWithoutImage = { ...mockPost, featuredImageUrl: null };
    renderPostCard(postWithoutImage);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders category badges', () => {
    renderPostCard();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('renders tag badges with hash prefix', () => {
    renderPostCard();
    expect(screen.getByText('#tokenomics')).toBeInTheDocument();
    expect(screen.getByText('#dao')).toBeInTheDocument();
  });

  it('card links to the correct slug', () => {
    renderPostCard();
    const link = screen.getByLabelText(`Read post: ${mockPost.title}`);
    expect(link).toHaveAttribute('href', `/blog/${mockPost.slug}`);
  });

  it('renders author initial avatar', () => {
    renderPostCard();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('clicking a tag calls onTagClick with the tag name', async () => {
    const user = userEvent.setup();
    const onTagClick = vi.fn();
    renderPostCard(mockPost, onTagClick);

    await user.click(screen.getByText('#tokenomics'));
    expect(onTagClick).toHaveBeenCalledWith('tokenomics');
  });
});

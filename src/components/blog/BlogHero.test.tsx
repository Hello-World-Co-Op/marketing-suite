import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BlogHero from './BlogHero';
import type { BlogPost } from '@/services/blogCanister';

const mockPost: BlogPost = {
  id: 1,
  title: 'Getting Started with Web3 DAOs',
  slug: 'getting-started-with-web3-daos',
  body: 'This is the full body of the blog post about DAOs and decentralized governance.',
  excerpt: 'An introduction to Web3 DAOs and how Hello World Co-Op is building a better future.',
  authorName: 'Alice Johnson',
  authorRole: 'Admin',
  categories: ['Announcements', 'Technology'],
  tags: ['dao', 'web3'],
  featuredImageUrl: 'https://example.com/featured.jpg',
  ogImageUrl: null,
  publishedAt: new Date('2026-01-15T10:00:00Z').getTime(),
  createdAt: new Date('2026-01-14T10:00:00Z').getTime(),
  updatedAt: new Date('2026-01-15T10:00:00Z').getTime(),
};

function renderBlogHero(post: BlogPost = mockPost) {
  return render(
    <MemoryRouter>
      <BlogHero featuredPost={post} />
    </MemoryRouter>,
  );
}

describe('BlogHero', () => {
  it('renders the featured post title and excerpt', () => {
    renderBlogHero();
    expect(screen.getByText(mockPost.title)).toBeInTheDocument();
    expect(screen.getByText(mockPost.excerpt)).toBeInTheDocument();
  });

  it('renders the featured image when present', () => {
    renderBlogHero();
    const img = screen.getByAltText(`Featured image for ${mockPost.title}`);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockPost.featuredImageUrl);
    // Hero image should use eager loading for LCP optimization
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('does not render featured image when not present', () => {
    const postWithoutImage = { ...mockPost, featuredImageUrl: null };
    renderBlogHero(postWithoutImage);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders author byline with name and date', () => {
    renderBlogHero();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('January 15, 2026')).toBeInTheDocument();
  });

  it('renders the "Read More" link navigating to the correct slug', () => {
    renderBlogHero();
    const link = screen.getByLabelText(`Read featured post: ${mockPost.title}`);
    expect(link).toHaveAttribute('href', `/blog/${mockPost.slug}`);
  });

  it('renders the blog tagline', () => {
    renderBlogHero();
    expect(
      screen.getByText('Insights from the Hello World Co-Op Community'),
    ).toBeInTheDocument();
  });

  it('renders category badges', () => {
    renderBlogHero();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('renders author initial avatar', () => {
    renderBlogHero();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

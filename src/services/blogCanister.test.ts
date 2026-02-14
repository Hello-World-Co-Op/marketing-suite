import { describe, it, expect } from 'vitest';
import { nsToMs, normalizePost, normalizeCategory } from './blogCanister';
import type { PostResponse, CategoryResponse } from './blogCanister';
import { Principal } from '@dfinity/principal';

describe('nsToMs', () => {
  it('converts nanoseconds to milliseconds', () => {
    // 1 second in nanoseconds = 1_000_000_000n
    expect(nsToMs(BigInt(1_000_000_000))).toBe(1000);
  });

  it('handles zero', () => {
    expect(nsToMs(BigInt(0))).toBe(0);
  });

  it('converts a realistic IC timestamp', () => {
    // Feb 1, 2026 12:00:00 UTC in nanoseconds
    const nanos = BigInt(new Date('2026-02-01T12:00:00Z').getTime()) * BigInt(1_000_000);
    const ms = nsToMs(nanos);
    expect(ms).toBe(new Date('2026-02-01T12:00:00Z').getTime());
  });
});

describe('normalizePost', () => {
  const createRawPost = (overrides?: Partial<PostResponse>): PostResponse => ({
    id: BigInt(1),
    title: 'Test Post',
    slug: 'test-post',
    body: 'This is the body',
    excerpt: 'This is the excerpt',
    author: Principal.anonymous(),
    author_name: 'Test Author',
    author_role: 'Admin',
    categories: ['Tech', 'News'],
    tags: ['test', 'blog'],
    status: { Published: null },
    featured_image_url: ['https://example.com/img.jpg'],
    og_image_url: [],
    created_at: BigInt(1706745600000) * BigInt(1_000_000), // 2024-02-01
    updated_at: BigInt(1706832000000) * BigInt(1_000_000), // 2024-02-02
    published_at: [BigInt(1706832000000) * BigInt(1_000_000)],
    scheduled_at: [],
    last_edited_by: [],
    ...overrides,
  });

  it('normalizes a PostResponse to a BlogPost', () => {
    const raw = createRawPost();
    const post = normalizePost(raw);

    expect(post.id).toBe(1);
    expect(post.title).toBe('Test Post');
    expect(post.slug).toBe('test-post');
    expect(post.body).toBe('This is the body');
    expect(post.excerpt).toBe('This is the excerpt');
    expect(post.authorName).toBe('Test Author');
    expect(post.authorRole).toBe('Admin');
    expect(post.categories).toEqual(['Tech', 'News']);
    expect(post.tags).toEqual(['test', 'blog']);
    expect(post.featuredImageUrl).toBe('https://example.com/img.jpg');
    expect(post.ogImageUrl).toBeNull();
    expect(post.publishedAt).toBe(1706832000000);
  });

  it('handles missing featured_image_url', () => {
    const raw = createRawPost({ featured_image_url: [] });
    const post = normalizePost(raw);
    expect(post.featuredImageUrl).toBeNull();
  });

  it('falls back to created_at when published_at is missing', () => {
    const raw = createRawPost({ published_at: [] });
    const post = normalizePost(raw);
    expect(post.publishedAt).toBe(1706745600000);
  });
});

describe('normalizeCategory', () => {
  it('normalizes a CategoryResponse to a BlogCategory', () => {
    const raw: CategoryResponse = {
      name: 'Technology',
      slug: 'technology',
      post_count: BigInt(5),
    };
    const cat = normalizeCategory(raw);
    expect(cat.name).toBe('Technology');
    expect(cat.slug).toBe('technology');
    expect(cat.postCount).toBe(5);
  });
});

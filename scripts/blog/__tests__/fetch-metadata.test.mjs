// @vitest-environment node
/**
 * Unit tests for fetch-metadata.mjs
 *
 * Tests the metadata fetching logic with mocked IC agent responses.
 * Does not make real network calls — uses vitest mocking.
 *
 * Story: BL-008.6.2 (Task 2 tests)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the exported fetchBlogMetadata function by mocking @dfinity/agent
vi.mock('@dfinity/agent', () => {
  const mockActor = {
    get_posts_metadata: vi.fn(),
  };

  return {
    HttpAgent: {
      create: vi.fn().mockResolvedValue({
        fetchRootKey: vi.fn(),
      }),
    },
    Actor: {
      createActor: vi.fn().mockReturnValue(mockActor),
    },
    __mockActor: mockActor,
  };
});

// Import after mock setup
const { HttpAgent, Actor, __mockActor } = await import('@dfinity/agent');
const { fetchBlogMetadata } = await import('../fetch-metadata.mjs');

describe('fetchBlogMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when canisterId is not provided', async () => {
    await expect(fetchBlogMetadata('')).rejects.toThrow('BLOG_CANISTER_ID is required');
    await expect(fetchBlogMetadata(null)).rejects.toThrow('BLOG_CANISTER_ID is required');
  });

  it('creates anonymous agent for IC mainnet', async () => {
    __mockActor.get_posts_metadata.mockResolvedValue([]);
    await fetchBlogMetadata('test-canister-id');

    expect(HttpAgent.create).toHaveBeenCalledWith({ host: 'https://ic0.app' });
  });

  it('uses custom host when provided', async () => {
    __mockActor.get_posts_metadata.mockResolvedValue([]);
    await fetchBlogMetadata('test-canister-id', 'http://localhost:4943');

    expect(HttpAgent.create).toHaveBeenCalledWith({ host: 'http://localhost:4943' });
  });

  it('converts BigInt values to numbers', async () => {
    __mockActor.get_posts_metadata.mockResolvedValue([
      {
        id: BigInt(42),
        title: 'Test Post',
        slug: 'test-post',
        excerpt: 'Test excerpt',
        author_name: 'Author',
        author_role: 'Admin',
        categories: ['Tech'],
        tags: ['test'],
        og_image_url: ['https://example.com/og.png'],
        featured_image_url: [],
        published_at: [BigInt(1700000000000000000)],
        updated_at: BigInt(1700100000000000000),
      },
    ]);

    const result = await fetchBlogMetadata('test-canister-id');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(42);
    expect(result[0].published_at).toBe(1700000000000000000);
    expect(result[0].updated_at).toBe(1700100000000000000);
    expect(typeof result[0].id).toBe('number');
  });

  it('converts Candid opt values correctly', async () => {
    __mockActor.get_posts_metadata.mockResolvedValue([
      {
        id: BigInt(1),
        title: 'With Image',
        slug: 'with-image',
        excerpt: 'Has OG image',
        author_name: 'Author',
        author_role: 'Admin',
        categories: [],
        tags: [],
        og_image_url: ['https://example.com/og.png'], // Candid opt = array with 0 or 1 elements
        featured_image_url: [], // Candid opt empty = null
        published_at: [BigInt(1700000000000000000)],
        updated_at: BigInt(1700000000000000000),
      },
    ]);

    const result = await fetchBlogMetadata('test-canister-id');

    expect(result[0].og_image_url).toBe('https://example.com/og.png');
    expect(result[0].featured_image_url).toBeNull();
  });

  it('handles empty response', async () => {
    __mockActor.get_posts_metadata.mockResolvedValue([]);

    const result = await fetchBlogMetadata('test-canister-id');
    expect(result).toEqual([]);
  });

  it('returns multiple posts', async () => {
    __mockActor.get_posts_metadata.mockResolvedValue([
      {
        id: BigInt(1),
        title: 'Post 1',
        slug: 'post-1',
        excerpt: 'Excerpt 1',
        author_name: 'Author 1',
        author_role: 'Admin',
        categories: [],
        tags: [],
        og_image_url: [],
        featured_image_url: [],
        published_at: [BigInt(1700000000000000000)],
        updated_at: BigInt(1700000000000000000),
      },
      {
        id: BigInt(2),
        title: 'Post 2',
        slug: 'post-2',
        excerpt: 'Excerpt 2',
        author_name: 'Author 2',
        author_role: 'Author',
        categories: ['Web3'],
        tags: ['blockchain'],
        og_image_url: [],
        featured_image_url: [],
        published_at: [],
        updated_at: BigInt(1700100000000000000),
      },
    ]);

    const result = await fetchBlogMetadata('test-canister-id');
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Post 1');
    expect(result[1].title).toBe('Post 2');
    expect(result[1].published_at).toBeNull();
  });
});

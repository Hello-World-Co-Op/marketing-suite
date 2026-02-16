/**
 * Blog Canister Query Service
 *
 * Provides anonymous IC canister queries to the blog canister for:
 * - list_posts() - Returns all published blog posts
 * - list_categories() - Returns categories with post counts
 * - get_post_by_slug() - Returns a single published post by slug
 *
 * All queries are anonymous (no authentication needed per NFR12).
 * IC returns nanosecond timestamps; helpers convert to JS milliseconds.
 */

import { HttpAgent, Actor, type ActorSubclass } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';

// ============================================================
// TypeScript interfaces mirroring Candid types from blog.did
// ============================================================

export type PostStatus = 'Draft' | 'Scheduled' | 'Published' | 'Archived';

export interface PostResponse {
  id: bigint;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  author: { toText: () => string };
  author_name: string;
  author_role: string;
  categories: string[];
  tags: string[];
  status: { Published: null } | { Draft: null } | { Scheduled: null } | { Archived: null };
  featured_image_url: [] | [string];
  og_image_url: [] | [string];
  created_at: bigint;
  updated_at: bigint;
  published_at: [] | [bigint];
  scheduled_at: [] | [bigint];
  last_edited_by: [] | [{ toText: () => string }];
}

export interface CategoryResponse {
  name: string;
  slug: string;
  post_count: bigint;
}

// ============================================================
// Normalized types for frontend consumption
// ============================================================

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  authorName: string;
  authorRole: string;
  categories: string[];
  tags: string[];
  featuredImageUrl: string | null;
  ogImageUrl: string | null;
  publishedAt: number; // JS milliseconds
  createdAt: number;
  updatedAt: number;
}

export interface BlogCategory {
  name: string;
  slug: string;
  postCount: number;
}

// ============================================================
// IDL Factory (Candid interface definition)
// ============================================================

const PostStatusVariant = IDL.Variant({
  Draft: IDL.Null,
  Scheduled: IDL.Null,
  Published: IDL.Null,
  Archived: IDL.Null,
});

const BlogErrorVariant = IDL.Variant({
  NotFound: IDL.Null,
  Unauthorized: IDL.Null,
  InvalidInput: IDL.Record({ field: IDL.Text, message: IDL.Text }),
  SlugTaken: IDL.Null,
  PostTooLarge: IDL.Null,
  StaleEdit: IDL.Null,
  ScheduleInPast: IDL.Null,
  InternalError: IDL.Text,
  DuplicateCategory: IDL.Record({ slug: IDL.Text }),
  CategoryNotFound: IDL.Record({ slug: IDL.Text }),
  TooManyCategories: IDL.Null,
  TooManyTags: IDL.Null,
});

const PostResponseType = IDL.Record({
  id: IDL.Nat64,
  title: IDL.Text,
  slug: IDL.Text,
  body: IDL.Text,
  excerpt: IDL.Text,
  author: IDL.Principal,
  author_name: IDL.Text,
  author_role: IDL.Text,
  categories: IDL.Vec(IDL.Text),
  tags: IDL.Vec(IDL.Text),
  status: PostStatusVariant,
  featured_image_url: IDL.Opt(IDL.Text),
  og_image_url: IDL.Opt(IDL.Text),
  created_at: IDL.Nat64,
  updated_at: IDL.Nat64,
  published_at: IDL.Opt(IDL.Nat64),
  scheduled_at: IDL.Opt(IDL.Nat64),
  last_edited_by: IDL.Opt(IDL.Principal),
});

const CategoryResponseType = IDL.Record({
  name: IDL.Text,
  slug: IDL.Text,
  post_count: IDL.Nat64,
});

const ListPostsInputType = IDL.Record({
  page: IDL.Nat32,
  page_size: IDL.Nat32,
});

const PaginatedPostResultType = IDL.Record({
  items: IDL.Vec(PostResponseType),
  total: IDL.Nat64,
  page: IDL.Nat32,
  page_size: IDL.Nat32,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
const idlFactory = ({ IDL: _IDL }: { IDL: any }) => {
  return IDL.Service({
    list_posts: IDL.Func(
      [ListPostsInputType],
      [IDL.Variant({ Ok: PaginatedPostResultType, Err: BlogErrorVariant })],
      ['query'],
    ),
    list_categories: IDL.Func([], [IDL.Vec(CategoryResponseType)], ['query']),
    get_post_by_slug: IDL.Func(
      [IDL.Text],
      [IDL.Variant({ Ok: PostResponseType, Err: BlogErrorVariant })],
      ['query'],
    ),
  });
};

// ============================================================
// Agent and Actor creation
// ============================================================

let _actor: ActorSubclass | null = null;

function getAgent(): HttpAgent {
  const host = import.meta.env.VITE_IC_HOST || 'https://ic0.app';
  // HttpAgent.createSync avoids the async Promise issue with HttpAgent.create in @dfinity/agent v3.x
  return HttpAgent.createSync({ host });
}

function getActor(): ActorSubclass {
  if (_actor) return _actor;

  const canisterId = import.meta.env.VITE_BLOG_CANISTER_ID;
  if (!canisterId) {
    throw new Error('VITE_BLOG_CANISTER_ID environment variable is not set');
  }

  const agent = getAgent();
  _actor = Actor.createActor(idlFactory, { agent, canisterId });
  return _actor;
}

/** Reset the cached actor (for testing) */
export function _resetActor(): void {
  _actor = null;
}

// ============================================================
// Conversion helpers
// ============================================================

/** Convert IC nanosecond timestamp to JS milliseconds */
export function nsToMs(ns: bigint): number {
  return Number(ns / BigInt(1_000_000));
}

/** Extract optional value from Candid opt type */
function unwrapOpt<T>(opt: [] | [T]): T | null {
  if (opt.length > 0) {
    return opt[0] as T;
  }
  return null;
}

/** Normalize a PostResponse from Candid to a BlogPost */
export function normalizePost(raw: PostResponse): BlogPost {
  return {
    id: Number(raw.id),
    title: raw.title,
    slug: raw.slug,
    body: raw.body,
    excerpt: raw.excerpt,
    authorName: raw.author_name,
    authorRole: raw.author_role,
    categories: raw.categories,
    tags: raw.tags,
    featuredImageUrl: unwrapOpt(raw.featured_image_url),
    ogImageUrl: unwrapOpt(raw.og_image_url),
    publishedAt: raw.published_at.length > 0 ? nsToMs(raw.published_at[0] as bigint) : nsToMs(raw.created_at),
    createdAt: nsToMs(raw.created_at),
    updatedAt: nsToMs(raw.updated_at),
  };
}

/** Normalize a CategoryResponse from Candid to a BlogCategory */
export function normalizeCategory(raw: CategoryResponse): BlogCategory {
  return {
    name: raw.name,
    slug: raw.slug,
    postCount: Number(raw.post_count),
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch published blog posts with pagination (anonymous query).
 * Returns posts sorted by published_at descending.
 */
export async function listPosts(page = 1, pageSize = 50): Promise<BlogPost[]> {
  const actor = getActor();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await actor.list_posts({ page, page_size: pageSize })) as any;
  if ('Err' in result) {
    const errKey = Object.keys(result.Err)[0];
    throw new Error(`Failed to fetch posts: ${errKey}`);
  }
  const rawPosts = result.Ok.items as PostResponse[];
  const posts = rawPosts.map(normalizePost);
  // Sort by publishedAt descending (most recent first)
  posts.sort((a, b) => b.publishedAt - a.publishedAt);
  return posts;
}

/**
 * Fetch all categories with post counts (anonymous query).
 */
export async function listCategories(): Promise<BlogCategory[]> {
  const actor = getActor();
  const rawCategories = (await actor.list_categories()) as CategoryResponse[];
  return rawCategories.map(normalizeCategory);
}

/**
 * Fetch a single published post by slug (anonymous query).
 * Throws an error if the post is not found.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost> {
  const actor = getActor();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await actor.get_post_by_slug(slug)) as any;
  if ('Err' in result) {
    const errKey = Object.keys(result.Err)[0];
    throw new Error(`Blog post not found: ${errKey}`);
  }
  return normalizePost(result.Ok);
}

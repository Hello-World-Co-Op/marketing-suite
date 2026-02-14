/**
 * Blog Metadata Fetcher
 *
 * Queries the blog canister on IC mainnet to retrieve metadata for all
 * published posts. Writes the result to dist/blog-metadata.json for
 * downstream scripts (HTML shells, RSS, sitemap).
 *
 * Uses anonymous agent — no authentication required for query calls.
 *
 * Environment variables:
 *   BLOG_CANISTER_ID — IC canister ID for the blog canister (required)
 *
 * Story: BL-008.6.2 (Task 2)
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const DIST = resolve(ROOT, 'dist');

// Maximum response size from IC boundary node query (2MB)
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

// ============================================================
// Candid IDL for PostMetadata (inline to avoid .did file dependency)
// Mirrors: blog canister get_posts_metadata() -> vec PostMetadata
// ============================================================
const PostMetadata = IDL.Record({
  id: IDL.Nat64,
  title: IDL.Text,
  slug: IDL.Text,
  excerpt: IDL.Text,
  author_name: IDL.Text,
  author_role: IDL.Text,
  categories: IDL.Vec(IDL.Text),
  tags: IDL.Vec(IDL.Text),
  og_image_url: IDL.Opt(IDL.Text),
  featured_image_url: IDL.Opt(IDL.Text),
  published_at: IDL.Opt(IDL.Nat64),
  updated_at: IDL.Nat64,
});

const blogIdlFactory = ({ IDL: idl }) => {
  return idl.Service({
    get_posts_metadata: idl.Func([], [idl.Vec(PostMetadata)], ['query']),
  });
};

/**
 * Fetch blog post metadata from IC mainnet.
 *
 * @param {string} canisterId - Blog canister ID
 * @param {string} [host] - IC host URL (default: https://ic0.app)
 * @returns {Promise<Array>} Array of PostMetadata objects
 */
export async function fetchBlogMetadata(canisterId, host = 'https://ic0.app') {
  if (!canisterId) {
    throw new Error('BLOG_CANISTER_ID is required');
  }

  const agent = await HttpAgent.create({ host });

  // Anonymous agent — no identity needed for query calls
  // In non-production environments, fetch the root key
  if (!host.includes('ic0.app') && !host.includes('icp0.io')) {
    await agent.fetchRootKey();
  }

  const actor = Actor.createActor(blogIdlFactory, {
    agent,
    canisterId,
  });

  const metadata = await actor.get_posts_metadata();

  // Convert BigInt values to numbers for JSON serialization
  const serializable = metadata.map((post) => ({
    id: Number(post.id),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    author_name: post.author_name,
    author_role: post.author_role,
    categories: post.categories,
    tags: post.tags,
    og_image_url: post.og_image_url.length > 0 ? post.og_image_url[0] : null,
    featured_image_url: post.featured_image_url.length > 0 ? post.featured_image_url[0] : null,
    published_at: post.published_at.length > 0 ? Number(post.published_at[0]) : null,
    updated_at: Number(post.updated_at),
  }));

  return serializable;
}

/**
 * Main entry point — fetch metadata and write to dist/blog-metadata.json
 */
async function main() {
  const canisterId = process.env.BLOG_CANISTER_ID;
  if (!canisterId) {
    console.error('Error: BLOG_CANISTER_ID environment variable is required');
    process.exit(1);
  }

  console.log(`Fetching blog metadata from canister ${canisterId}...`);

  try {
    const metadata = await fetchBlogMetadata(canisterId);

    // Verify response size is under 2MB boundary node limit
    const jsonStr = JSON.stringify(metadata, null, 2);
    const responseSize = Buffer.byteLength(jsonStr, 'utf-8');
    if (responseSize > MAX_RESPONSE_BYTES) {
      console.error(
        `Warning: Response size (${(responseSize / 1024 / 1024).toFixed(2)} MB) exceeds 2MB boundary node limit.`
      );
    }

    await mkdir(DIST, { recursive: true });
    const outPath = resolve(DIST, 'blog-metadata.json');
    await writeFile(outPath, jsonStr, 'utf-8');

    console.log(`Blog metadata written: ${outPath} (${metadata.length} posts, ${(responseSize / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('Failed to fetch blog metadata:', err.message || err);
    process.exit(1);
  }
}

// Only run main when executed directly (not when imported by tests)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main();
}

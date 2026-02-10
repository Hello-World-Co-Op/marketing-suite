// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Build output validation tests.
 *
 * These tests verify that `npm run build` produces the expected
 * pre-rendered HTML, sitemap.xml, robots.txt, and OG image.
 *
 * Run these tests AFTER a build: `npm run build && npm test`
 * In CI, the build step runs before tests.
 *
 * If dist/ does not exist (e.g., fresh clone without build),
 * these tests skip gracefully.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST = resolve(__dirname, '../../dist');
const distExists = existsSync(DIST);

describe.skipIf(!distExists)('Build output validation', () => {
  it('dist/index.html contains pre-rendered page content', () => {
    const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');

    // Should not be empty root div
    expect(html).not.toContain('<div id="root"></div>');
    // Should have actual content inside root
    expect(html).toContain('<div id="root">');
    // Should contain LaunchPage content (min-h-screen is the root wrapper)
    expect(html).toContain('min-h-screen');
  });

  it('dist/index.html contains SEO meta tags for homepage', () => {
    const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');

    expect(html).toContain('Hello World Co-Op | Building a Regenerative Future');
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('og:image');
    expect(html).toContain('twitter:card');
    expect(html).toContain('twitter:title');
    expect(html).toContain('canonical');
    expect(html).toContain('https://www.helloworlddao.com/');
  });

  it('dist/privacy-policy/index.html exists and contains page content', () => {
    const html = readFileSync(resolve(DIST, 'privacy-policy/index.html'), 'utf-8');

    // Should have actual content
    expect(html).not.toContain('<div id="root"></div>');
    expect(html).toContain('Privacy Policy');
    expect(html).toContain('Hello World Co-Op DAO');
    expect(html).toContain('GDPR');
  });

  it('dist/privacy-policy/index.html contains SEO meta tags', () => {
    const html = readFileSync(resolve(DIST, 'privacy-policy/index.html'), 'utf-8');

    expect(html).toContain('Privacy Policy | Hello World Co-Op');
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('twitter:card');
    expect(html).toContain('canonical');
    expect(html).toContain('https://www.helloworlddao.com/privacy-policy');
  });

  it('dist/sitemap.xml exists and contains correct routes', () => {
    const sitemap = readFileSync(resolve(DIST, 'sitemap.xml'), 'utf-8');

    expect(sitemap).toContain('<?xml');
    expect(sitemap).toContain('urlset');
    expect(sitemap).toContain('https://www.helloworlddao.com/');
    expect(sitemap).toContain('https://www.helloworlddao.com/privacy-policy');
    expect(sitemap).toContain('lastmod');
    expect(sitemap).toContain('changefreq');
    expect(sitemap).toContain('priority');
  });

  it('dist/robots.txt exists and references sitemap', () => {
    const robots = readFileSync(resolve(DIST, 'robots.txt'), 'utf-8');

    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://www.helloworlddao.com/sitemap.xml');
  });

  it('dist/og-image.png exists', () => {
    expect(existsSync(resolve(DIST, 'og-image.png'))).toBe(true);
  });
});

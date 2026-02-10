// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import { SEO } from './SEO';

/**
 * SEO component tests.
 *
 * Uses react-dom/server renderToString in a Node environment (not jsdom)
 * so that react-helmet-async correctly populates its context object.
 * In a jsdom environment, helmet detects the DOM and uses client-side
 * behavior which doesn't populate the context.
 */

function renderSEO(props: React.ComponentProps<typeof SEO>): HelmetServerState {
  const helmetContext: { helmet?: HelmetServerState } = {};
  renderToString(
    <HelmetProvider context={helmetContext}>
      <SEO {...props} />
    </HelmetProvider>,
  );
  return helmetContext.helmet!;
}

describe('SEO', () => {
  it('renders title and description meta tags', () => {
    const helmet = renderSEO({
      title: 'Test Page | Hello World Co-Op',
      description: 'A test description for SEO purposes.',
    });

    expect(helmet.title.toString()).toContain('Test Page | Hello World Co-Op');

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('A test description for SEO purposes.');
  });

  it('renders Open Graph meta tags', () => {
    const helmet = renderSEO({
      title: 'OG Test',
      description: 'OG description',
      url: 'https://www.helloworlddao.com/test',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('og:title');
    expect(metaStr).toContain('OG Test');
    expect(metaStr).toContain('og:description');
    expect(metaStr).toContain('OG description');
    expect(metaStr).toContain('og:url');
    expect(metaStr).toContain('https://www.helloworlddao.com/test');
    expect(metaStr).toContain('og:type');
    expect(metaStr).toContain('website');
    expect(metaStr).toContain('og:image');
    expect(metaStr).toContain('og-image.png');
    expect(metaStr).toContain('og:site_name');
    expect(metaStr).toContain('Hello World Co-Op');
  });

  it('renders Twitter Card meta tags', () => {
    const helmet = renderSEO({
      title: 'Twitter Test',
      description: 'Twitter description',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('twitter:card');
    expect(metaStr).toContain('summary_large_image');
    expect(metaStr).toContain('twitter:title');
    expect(metaStr).toContain('Twitter Test');
    expect(metaStr).toContain('twitter:description');
    expect(metaStr).toContain('Twitter description');
    expect(metaStr).toContain('twitter:image');
  });

  it('renders canonical link when url is provided', () => {
    const helmet = renderSEO({
      title: 'Canonical Test',
      description: 'Canonical test desc',
      url: 'https://www.helloworlddao.com/page',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).toContain('canonical');
    expect(linkStr).toContain('https://www.helloworlddao.com/page');
  });

  it('does not render canonical link when url is omitted', () => {
    const helmet = renderSEO({
      title: 'No URL Test',
      description: 'No URL desc',
    });

    const linkStr = helmet.link.toString();
    expect(linkStr).not.toContain('canonical');
  });

  it('allows custom OG type', () => {
    const helmet = renderSEO({
      title: 'Article',
      description: 'An article',
      type: 'article',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('article');
  });

  it('allows custom Twitter card type', () => {
    const helmet = renderSEO({
      title: 'Summary Card',
      description: 'A summary card test',
      twitterCard: 'summary',
    });

    const metaStr = helmet.meta.toString();
    // content="summary" (not summary_large_image)
    expect(metaStr).toContain('content="summary"');
  });

  it('uses default OG image when none provided', () => {
    const helmet = renderSEO({
      title: 'Default Image',
      description: 'Default image test',
    });

    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('https://www.helloworlddao.com/og-image.png');
  });
});

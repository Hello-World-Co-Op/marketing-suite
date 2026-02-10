// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import { StaticRouter } from 'react-router-dom/server';
import PrivacyPolicy from './PrivacyPolicy';

/**
 * Page-level SEO tests -- verify each page sets the correct
 * title, description, OG, and Twitter Card meta tags via the SEO component.
 *
 * Uses renderToString in a Node environment (not jsdom) so that
 * react-helmet-async correctly populates its context object.
 *
 * LaunchPage is excluded from these unit tests because it depends on multiple
 * component imports with heavy i18n and canister dependencies. Its SEO tags
 * are verified by the build-output validation test (build-output.test.ts).
 */

function renderPrivacyPolicySEO(): HelmetServerState {
  const helmetContext: { helmet?: HelmetServerState } = {};
  renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location="/privacy-policy">
        <PrivacyPolicy />
      </StaticRouter>
    </HelmetProvider>,
  );
  return helmetContext.helmet!;
}

describe('PrivacyPolicy SEO', () => {
  it('sets the correct page title', () => {
    const helmet = renderPrivacyPolicySEO();
    expect(helmet.title.toString()).toContain('Privacy Policy | Hello World Co-Op');
  });

  it('sets the correct meta description', () => {
    const helmet = renderPrivacyPolicySEO();
    const metaStr = helmet.meta.toString();
    expect(metaStr).toContain('privacy');
    expect(metaStr).toContain('GDPR');
  });

  it('sets OG tags for the privacy policy page', () => {
    const helmet = renderPrivacyPolicySEO();
    const metaStr = helmet.meta.toString();

    expect(metaStr).toContain('og:title');
    expect(metaStr).toContain('Privacy Policy | Hello World Co-Op');
    expect(metaStr).toContain('og:url');
    expect(metaStr).toContain('https://www.helloworlddao.com/privacy-policy');
    expect(metaStr).toContain('og:type');
    expect(metaStr).toContain('og:image');
  });

  it('sets Twitter Card tags for the privacy policy page', () => {
    const helmet = renderPrivacyPolicySEO();
    const metaStr = helmet.meta.toString();

    expect(metaStr).toContain('twitter:card');
    expect(metaStr).toContain('summary_large_image');
    expect(metaStr).toContain('twitter:title');
    expect(metaStr).toContain('Privacy Policy | Hello World Co-Op');
  });

  it('sets a canonical URL for the privacy policy page', () => {
    const helmet = renderPrivacyPolicySEO();
    const linkStr = helmet.link.toString();

    expect(linkStr).toContain('canonical');
    expect(linkStr).toContain('https://www.helloworlddao.com/privacy-policy');
  });
});

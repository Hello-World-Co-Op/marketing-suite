/**
 * Pre-render entry point for static HTML generation.
 *
 * This module exports a render function used by the prerender build script
 * to generate static HTML for each route at build time.
 *
 * It uses StaticRouter (instead of BrowserRouter) so React Router can
 * resolve the correct route without a browser environment.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { Routes, Route } from 'react-router-dom';
import LaunchPage from './pages/LaunchPage';
import PrivacyPolicy from './pages/PrivacyPolicy';

/**
 * Render a given URL path to static HTML string.
 * Returns both the page HTML and the helmet data (for injecting meta tags into <head>).
 */
export function render(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helmetContext: { helmet?: any } = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <Routes>
          <Route path="/" element={<LaunchPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
      </StaticRouter>
    </HelmetProvider>,
  );

  const { helmet } = helmetContext;

  return { html, helmet };
}

/** Routes to pre-render at build time */
export const routes = ['/', '/privacy-policy'];

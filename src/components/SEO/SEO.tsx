import { Helmet } from 'react-helmet-async';

/**
 * SEO component for managing document head meta tags.
 *
 * Uses react-helmet-async to inject title, description, Open Graph,
 * and Twitter Card meta tags into the document head.
 *
 * Usage:
 *   <SEO
 *     title="Page Title | Hello World Co-Op"
 *     description="Page description for search engines"
 *     url="https://www.helloworlddao.com/page"
 *   />
 *
 * To add SEO to a new page:
 * 1. Import SEO from '@/components/SEO'
 * 2. Place <SEO ... /> at the top of your page component's JSX
 * 3. Provide title, description, and canonical url
 */

export interface SEOProps {
  /** Page title - will appear in browser tab and search results */
  title: string;
  /** Meta description for search engines (recommended: 150-160 characters) */
  description: string;
  /** Canonical URL for this page */
  url?: string;
  /** Open Graph type (default: 'website') */
  type?: string;
  /** Path to Open Graph image (default: '/og-image.png') */
  image?: string;
  /** Twitter card type (default: 'summary_large_image') */
  twitterCard?: 'summary' | 'summary_large_image';
  /** RSS feed URL for auto-discovery (adds <link rel="alternate" type="application/rss+xml">) */
  rssUrl?: string;
  /** RSS feed title for auto-discovery link tag */
  rssTitle?: string;
}

const SITE_NAME = 'Hello World Co-Op';
const DEFAULT_IMAGE = 'https://www.helloworlddao.com/og-image.png';

export function SEO({
  title,
  description,
  url,
  type = 'website',
  image = DEFAULT_IMAGE,
  twitterCard = 'summary_large_image',
  rssUrl,
  rssTitle = 'Hello World DAO Blog',
}: SEOProps) {
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      {url && <meta property="og:url" content={url} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}

      {/* RSS Feed Auto-Discovery */}
      {rssUrl && (
        <link rel="alternate" type="application/rss+xml" title={rssTitle} href={rssUrl} />
      )}

      {/* Future enhancement: Add structured data (JSON-LD) here for rich search results
       * Example: Organization schema, WebSite schema, BreadcrumbList
       * See: https://schema.org/
       */}
    </Helmet>
  );
}

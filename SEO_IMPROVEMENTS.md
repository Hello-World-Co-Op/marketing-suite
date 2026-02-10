# SEO Improvements for Future Sprints

This document tracks SEO enhancements identified during FAS-4.2 code review but deferred as low priority.

## 1. IC Asset Canister Cache Headers

**Priority:** LOW
**Effort:** 2-4 hours research + documentation

### Issue
IC asset canisters serve static files but cache behavior is not documented. If cache headers are too aggressive, updated meta tags won't be served to crawlers after redeployment.

### Tasks
- [ ] Research IC asset canister cache-control headers
- [ ] Document how to verify crawlers get fresh content after deployment
- [ ] Add deployment verification step: `curl -I https://www.helloworlddao.com/` to check headers
- [ ] Test with Google Search Console "Request Indexing" after deploy
- [ ] Document recommended cache TTLs for HTML vs assets

### References
- IC HTTP Gateway documentation
- dfx.json asset configuration options

---

## 2. OG Image Quality Verification

**Priority:** LOW
**Effort:** 30 minutes - 2 hours

### Issue
`public/og-image.png` is only 3.6KB for a 1200x630 image, which is suspiciously small. This suggests either:
- It's a placeholder/blank image
- Heavily compressed/low quality
- Solid color with minimal content

Social platforms may show poor-quality preview images.

### Tasks
- [ ] Open og-image.png and verify it contains actual branding/visual content
- [ ] If placeholder, design proper social sharing image (1200x630px)
- [ ] Include Hello World Co-Op logo, tagline, and visual identity
- [ ] Test image quality on:
  - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
  - Twitter Card Validator: https://cards-dev.twitter.com/validator
  - LinkedIn Post Inspector
- [ ] Aim for 50-200KB file size (good quality, reasonable load time)

### Acceptance Criteria
- og-image.png displays recognizable Hello World Co-Op branding
- Image previews correctly on Facebook, Twitter, LinkedIn
- File size < 500KB (social platform limits)

---

## 3. Git-Based Sitemap lastmod Dates

**Priority:** LOW
**Effort:** 4-6 hours

### Issue
`scripts/generate-sitemap.ts` sets `lastmod` to build date for ALL routes, not the actual last modification date of each page. This is misleading to search engines.

Current behavior:
- Rebuild daily → all pages show lastmod = yesterday
- Even if /privacy-policy unchanged for months

### Proposed Solution
Query git commit dates for each route's source file and use that as lastmod.

```typescript
import { execSync } from 'child_process';

function getLastModified(filePath: string): string {
  try {
    const timestamp = execSync(
      `git log -1 --format=%cI -- ${filePath}`,
      { encoding: 'utf-8' }
    ).trim();
    return timestamp.split('T')[0]; // ISO date only
  } catch (err) {
    // Fallback to build date if git fails (e.g., CI shallow clone)
    return new Date().toISOString().split('T')[0];
  }
}

const routes: SitemapRoute[] = [
  { path: '/', file: 'src/pages/LaunchPage.tsx', changefreq: 'weekly', priority: 1.0 },
  { path: '/privacy-policy', file: 'src/pages/PrivacyPolicy.tsx', changefreq: 'monthly', priority: 0.5 },
];

// In sitemap generation:
const lastmod = getLastModified(route.file);
```

### Tasks
- [ ] Implement git-based lastmod lookup
- [ ] Handle CI shallow clone edge case (git log fails)
- [ ] Test with files that haven't changed in weeks
- [ ] Update sitemap.ts documentation
- [ ] Validate sitemap.xml format after change

### Trade-offs
- **Pro:** More accurate lastmod signals to search engines
- **Pro:** Better crawler prioritization (crawl fresh pages first)
- **Con:** Adds 1-2s to build time (git log per route)
- **Con:** Requires full git history in CI (no shallow clone)

---

## 4. Structured Data (JSON-LD)

**Priority:** LOW (out of scope for FAS-4.2, but documented for future)
**Effort:** 6-8 hours

### Issue
Pages lack structured data (JSON-LD) for rich search results. This limits potential for enhanced search listings (e.g., organization info, breadcrumbs, FAQs).

### Proposed Schemas
1. **Organization schema** (LaunchPage)
   - Name, logo, social profiles, contact info
   - Enables knowledge panel in Google search results

2. **WebSite schema** (LaunchPage)
   - Potential site search box in Google results

3. **BreadcrumbList schema** (all pages)
   - Enhanced navigation in search results

### Implementation
Add JSON-LD to SEO component:

```tsx
export function SEO({ title, description, url, breadcrumbs, schema }: SEOProps) {
  return (
    <Helmet>
      {/* Existing meta tags */}

      {/* Structured data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}

// Usage in LaunchPage:
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Hello World Co-Op",
  "url": "https://www.helloworlddao.com",
  "logo": "https://www.helloworlddao.com/logo.png",
  "sameAs": [
    "https://twitter.com/helloworlddao",
    "https://github.com/Hello-World-Co-Op"
  ]
};

<SEO title="..." description="..." schema={organizationSchema} />
```

### Tasks
- [ ] Research applicable schema.org types
- [ ] Implement Organization schema on LaunchPage
- [ ] Implement BreadcrumbList on sub-pages
- [ ] Test with Google Rich Results Test: https://search.google.com/test/rich-results
- [ ] Validate JSON-LD with schema.org validator
- [ ] Document schema usage in README

### References
- https://schema.org/Organization
- https://schema.org/WebSite
- https://schema.org/BreadcrumbList
- https://developers.google.com/search/docs/appearance/structured-data

---

## 5. Additional Meta Tags for Social Platforms

**Priority:** LOW
**Effort:** 2-3 hours

### Missing Tags
Current SEO component includes basic OG and Twitter Card tags, but could add:

- `og:locale` (e.g., "en_US") - improves i18n targeting
- `og:site_name` - already present, but could be per-page
- `twitter:site` - @helloworlddao Twitter handle
- `twitter:creator` - author Twitter handle (if applicable)
- `article:published_time` - for blog posts (future)
- `article:author` - for blog posts (future)

### Implementation
```tsx
export function SEO({
  title,
  description,
  url,
  twitterHandle,
  locale = 'en_US'
}: SEOProps) {
  return (
    <Helmet>
      {/* Existing tags */}

      <meta property="og:locale" content={locale} />
      {twitterHandle && <meta name="twitter:site" content={`@${twitterHandle}`} />}
    </Helmet>
  );
}
```

---

## Review Notes

These improvements were identified during FAS-4.2 code review but classified as LOW priority. They do not block story completion or deployment.

**HIGH/MEDIUM issues were fixed in commit cc70501:**
- ✅ Duplicate title/description tags
- ✅ Hydration mismatch with dynamic year
- ✅ Lazy loading conflicts
- ✅ Missing robots meta tag
- ✅ Prerender validation

**Story verdict: NEEDS_MINOR_FIXES → All fixed and committed**

All tests pass (83/83), lint clean, build succeeds.

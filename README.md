# Marketing Suite

Public-facing marketing website for Hello World Co-Op DAO. Features the landing page with sunrise scroll animation, waitlist signup flow with client-side PII encryption, email verification, and GDPR-compliant privacy policy.

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- dfx CLI (for IC deployment, optional for local dev)

### Local Development

1. Copy `.env.example` to `.env.local` and configure environment variables
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173

## Available Scripts

- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production (TypeScript check + Vite build + prerender + sitemap)
- `npm test` - Run unit tests (Vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:e2e` - Run E2E tests (Playwright)
- `npm run test:e2e:ui` - Run E2E tests with UI
- `npm run lint` - Lint TypeScript/React code
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to IC (via dfx)

## Project Structure

```
marketing-suite/
├── src/
│   ├── components/
│   │   ├── HeroSection/          # Hero with typing animation and globe
│   │   ├── AboutSection/         # Mission and vision content
│   │   ├── LaunchContent/        # 9 content sections (Intro, Video, Ecosystem, etc.)
│   │   ├── SEO/                  # Reusable SEO component (meta tags, OG, Twitter)
│   │   ├── ExpandableForm/       # Animated form container for CTA buttons
│   │   ├── InterestForm/         # Waitlist signup form (name, email, location)
│   │   ├── VerificationCodeForm/ # 6-digit email verification
│   │   ├── LanguageSelector/     # i18n language switcher (EN, ES, FR, PT)
│   │   └── Select/               # Headless UI accessible select component
│   ├── pages/
│   │   ├── LaunchPage.tsx        # Main landing page with sunrise animation
│   │   └── PrivacyPolicy.tsx     # GDPR-compliant privacy policy
│   ├── hooks/
│   │   └── useUserService.ts     # IC canister actor for user-service
│   ├── utils/
│   │   ├── crypto.ts             # AES-256-GCM encryption, SHA-256 hashing
│   │   ├── formTransformers.ts   # Form data to canister request transformer
│   │   ├── validation.ts         # Zod schemas for form validation
│   │   ├── analytics.ts          # PostHog, GA, custom backend tracking
│   │   ├── toast.ts              # Simple toast notification system
│   │   ├── i18n.ts               # i18next configuration
│   │   ├── cn.ts                 # Tailwind class name utility
│   │   ├── throttle.ts           # Scroll throttle utility
│   │   └── logger.ts             # Dev-only namespaced logger
│   ├── types/                    # TypeScript type definitions
│   ├── data/                     # Static data (postal code formats)
│   ├── test/                     # Test setup and utilities
│   ├── App.tsx                   # Root component with router
│   ├── entry-prerender.tsx        # SSR entry point for static HTML generation
│   ├── main.tsx                  # Entry point with i18n init and hydration
│   └── index.css                 # Global styles and Tailwind config
├── scripts/
│   ├── prerender.ts              # Build-time static HTML pre-rendering
│   └── generate-sitemap.ts       # Build-time sitemap.xml generation
├── public/
│   ├── locales/                  # i18n translation files (en, es, fr, pt)
│   ├── robots.txt                # Search engine crawler directives
│   ├── og-image.png              # Open Graph social sharing image
│   ├── world.jpg                 # Hero globe image
│   └── globe.svg                 # Globe SVG icon
├── e2e/specs/                    # Playwright E2E test skeletons
├── .github/workflows/            # CI/CD deployment workflow
├── dfx.json                      # IC asset canister configuration
└── package.json
```

## Key Features

- **Sunrise Scroll Animation**: Background gradient transitions from night to day as user scrolls
- **Waitlist Signup**: Expandable form at multiple CTA points, shared form state to prevent data loss
- **Client-Side Encryption**: PII encrypted with AES-256-GCM before submission to IC canister
- **Email Verification**: 6-digit code verification flow
- **Internationalization**: 4 languages (English, Spanish, French, Portuguese)
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes
- **Code Splitting**: Lazy-loaded routes and manual chunks for optimal bundle size
- **SEO Pre-rendering**: Static HTML generation at build time for search engine indexing

## Environment Variables

Required environment variables (configure in `.env.local`):

- `VITE_USER_SERVICE_CANISTER_ID` - User service canister ID
- `VITE_NETWORK` - Network (local, ic)
- `VITE_ORACLE_BRIDGE_URL` - Oracle bridge URL for encryption keys

Optional:
- `VITE_GA_MEASUREMENT_ID` - Google Analytics ID
- `VITE_POSTHOG_KEY` - PostHog API key
- `VITE_ANALYTICS_ENDPOINT` - Custom analytics endpoint

## Bundle Size

Total gzipped JS: ~353 KB (split across lazy-loaded chunks)
- Initial load (vendor + i18n + index): ~84 KB gzipped
- LaunchPage chunk: ~22 KB gzipped
- Form chunk (with country-state-city data): ~157 KB gzipped (lazy-loaded on form open)

## Testing

### Unit Tests (Vitest) - 83 tests

```bash
npm test                  # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### E2E Tests (Playwright)

```bash
npm run test:e2e          # Run all browsers
npm run test:e2e:ui       # Interactive UI mode
```

## SEO

### How It Works

The build pipeline generates SEO-optimized static HTML:

1. **`vite build`** produces the standard SPA bundle in `dist/`
2. **`scripts/prerender.ts`** renders each route to static HTML using `ReactDOMServer.renderToString()`, injecting:
   - Full page content into `<div id="root">` (instead of empty div)
   - SEO meta tags from `react-helmet-async` into `<head>` (title, OG, Twitter Card, canonical)
3. **`scripts/generate-sitemap.ts`** creates `dist/sitemap.xml` with all routes

When the browser loads a pre-rendered page, React detects existing content and **hydrates** (attaches event handlers) instead of re-rendering from scratch.

### Build Output

After `npm run build`, the dist/ directory contains:
- `dist/index.html` - Pre-rendered homepage with full content
- `dist/privacy-policy/index.html` - Pre-rendered privacy policy
- `dist/sitemap.xml` - Sitemap for search engines
- `dist/robots.txt` - Crawler directives (from public/)
- `dist/og-image.png` - Open Graph social sharing image

### Adding SEO to a New Page

1. Import the SEO component:
   ```tsx
   import { SEO } from '../components/SEO';
   ```
2. Add `<SEO>` at the top of your page component's JSX:
   ```tsx
   <SEO
     title="Page Title | Hello World Co-Op"
     description="Description for search engines (150-160 chars)"
     url="https://www.helloworlddao.com/your-page"
   />
   ```
3. Add the route to `src/entry-prerender.tsx` (routes array and Routes component)
4. Add the route to `scripts/generate-sitemap.ts` (routes array)
5. Run `npm run build` to verify pre-rendered output

### Meta Tags

Each page includes:
- `<title>` - Page title
- `<meta name="description">` - Search engine description
- `<meta property="og:*">` - Open Graph tags (title, description, image, url, type, site_name)
- `<meta name="twitter:*">` - Twitter Card tags (card, title, description, image)
- `<link rel="canonical">` - Canonical URL

## Deployment

CI/CD is configured via GitHub Actions using the shared `suite-deploy.yml` reusable workflow from `Hello-World-Co-Op/.github`.

### Manual Deployment

```bash
dfx deploy --network testnet
# or
dfx deploy --network mainnet
```

### Rollback Procedure

If a deployment causes issues, follow these steps to rollback:

1. **Identify the previous deployment:**
   - Check git log: `git log --oneline -n 5`
   - Check GitHub releases for the last stable version
   - Note the commit hash of the last known good deployment

2. **Revert the deployment:**
   - For code-level rollback: `git revert <commit-hash> && git push`
   - Pushing to main triggers automatic redeploy via CI/CD workflow
   - Monitor GitHub Actions workflow to confirm successful deployment

3. **For canister-level rollback (advanced):**
   - Obtain the previous WASM file from git history or build artifacts
   - Run: `dfx canister install marketing_suite_assets --mode reinstall --wasm <previous.wasm> --network <testnet|mainnet>`
   - This reinstalls the canister with the previous version

4. **Emergency DNS rollback:**
   - If the new canister is broken, revert DNS to the old monolith canister
   - Update IC boundary node routing to point www.helloworlddao.com back to previous canister
   - This requires IC dashboard access or dfx routing configuration

5. **Verification:**
   - Visit https://www.helloworlddao.com to confirm rollback successful
   - Test all critical paths (landing page, form submission, email verification)
   - Monitor error logs and user reports

## Architecture Notes

- React 18 with TypeScript (strict mode)
- Vite 5 for build and dev server
- Tailwind CSS 3 for styling (standalone config, no shared UI dependency)
- React Router 6 for routing
- react-hook-form + Zod for form validation
- react-i18next for internationalization
- @dfinity/agent for IC canister communication
- Headless UI for accessible select components
- Vitest for unit tests
- Playwright for E2E tests

**This is a standalone suite** -- it does not depend on `@hello-world-co-op/auth` or `@hello-world-co-op/api`. There is no user authentication requirement for the marketing site.

## FAS Developer Documentation

This suite is part of the [Frontend Application Split (FAS)](https://github.com/Hello-World-Co-Op/docs/blob/main/developer/fas-architecture.md) project. For cross-cutting documentation:

- [FAS Architecture Overview](https://github.com/Hello-World-Co-Op/docs/blob/main/developer/fas-architecture.md) -- Package/suite architecture, dependency diagram, CI/CD pipeline
- [FAS Repository Map](https://github.com/Hello-World-Co-Op/docs/blob/main/developer/fas-repository-map.md) -- All FAS repos and "where do I make changes?"
- [FAS Local Setup Guide](https://github.com/Hello-World-Co-Op/docs/blob/main/developer/fas-local-setup.md) -- npm link workflow, cross-package development
- [FAS Suite Creation Guide](https://github.com/Hello-World-Co-Op/docs/blob/main/developer/fas-create-suite.md) -- Creating new suites from the template
- [FAS Troubleshooting](https://github.com/Hello-World-Co-Op/docs/blob/main/developer/fas-troubleshooting.md) -- Common issues and fixes (see SEO section)
- [FAS Rollback Procedures](https://github.com/Hello-World-Co-Op/docs/blob/main/developer/fas-rollback-procedures.md) -- Suite-specific rollback steps

## License

MIT

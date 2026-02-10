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
- `npm run build` - Build for production (TypeScript check + Vite build)
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
│   ├── main.tsx                  # Entry point with i18n init
│   └── index.css                 # Global styles and Tailwind config
├── public/
│   ├── locales/                  # i18n translation files (en, es, fr, pt)
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

## Environment Variables

Required environment variables (configure in `.env.local`):

- `VITE_USER_SERVICE_CANISTER_ID` - User service canister ID
- `VITE_NETWORK` - Network (local, ic)
- `VITE_ORACLE_BRIDGE_URL` - Oracle bridge URL for encryption keys

Optional:
- `VITE_ORACLE_BRIDGE_API_TOKEN` - Oracle bridge API token
- `VITE_GA_MEASUREMENT_ID` - Google Analytics ID
- `VITE_POSTHOG_KEY` - PostHog API key
- `VITE_ANALYTICS_ENDPOINT` - Custom analytics endpoint

## Bundle Size

Total gzipped JS: ~353 KB (split across lazy-loaded chunks)
- Initial load (vendor + i18n + index): ~84 KB gzipped
- LaunchPage chunk: ~22 KB gzipped
- Form chunk (with country-state-city data): ~157 KB gzipped (lazy-loaded on form open)

## Testing

### Unit Tests (Vitest) - 63 tests

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

## Deployment

CI/CD is configured via GitHub Actions using the shared `suite-deploy.yml` reusable workflow from `Hello-World-Co-Op/.github`.

### Manual Deployment

```bash
dfx deploy --network testnet
# or
dfx deploy --network mainnet
```

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

## License

MIT

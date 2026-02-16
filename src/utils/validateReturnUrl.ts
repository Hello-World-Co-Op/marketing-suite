/**
 * Return URL Validation Utility
 *
 * Prevents open redirect vulnerabilities by validating and sanitizing
 * return URLs before redirect. Only allows relative paths to known
 * application routes, plus absolute URLs to trusted *.helloworlddao.com
 * domains for cross-suite SSO.
 *
 * Duplicated from foundery-os-suite for marketing-suite context.
 * Tech debt: Extract to shared @hello-world-co-op/auth or @hello-world-co-op/ui package.
 *
 * @see FOS-5.6.5 AC-5.6.5.1 - Open redirect vulnerability fix
 * @see FAS-8.1 - Cross-suite SSO return URL support
 * @see BL-012.1 - Return URL threading through registration flow
 * @see OWASP Unvalidated Redirects and Forwards
 *
 * @module validateReturnUrl
 */

/**
 * Allowed path prefixes for relative redirects.
 * Marketing-suite context includes registration and verification routes.
 */
const ALLOWED_PATH_PREFIXES = [
  '/signup',
  '/verify',
  '/login',
  '/link-identity',
  '/mission-control',
  '/dashboard',
  '/settings',
  '/profile',
  '/chat',
  '/fleet',
  '/workspace',
  '/backlog',
  '/capture',
  '/admin',
  '/otter-camp',
  '/blog',
];

/**
 * Trusted domains for cross-suite SSO redirects (FAS-8.1).
 * Only HTTPS absolute URLs to these domains are allowed.
 */
const TRUSTED_DOMAINS = [
  '.helloworlddao.com',
];

/**
 * Default redirect destination when validation fails.
 * In marketing-suite context, fall back to home page.
 */
const DEFAULT_REDIRECT = '/';

/**
 * Check if an absolute URL points to a trusted domain for SSO
 */
function isTrustedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return TRUSTED_DOMAINS.some(
      (domain) => parsed.hostname === domain.slice(1) || parsed.hostname.endsWith(domain)
    );
  } catch {
    return false;
  }
}

/**
 * Check if an absolute URL is localhost for local development.
 * Allows http://localhost:PORT URLs (not requiring HTTPS for local dev).
 */
function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' ||
       parsed.hostname === '127.0.0.1' ||
       parsed.hostname === '[::1]');
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes a return URL to prevent open redirect attacks.
 *
 * Security checks:
 * - Allows absolute HTTPS URLs to trusted *.helloworlddao.com domains (SSO)
 * - Rejects all other absolute URLs
 * - Rejects protocol-relative URLs (//)
 * - Rejects dangerous URI schemes (data:, javascript:)
 * - Validates relative paths against allowlist of path prefixes
 * - Handles URL-encoded payloads
 *
 * @param url - The return URL to validate (may be URL-encoded)
 * @returns A safe, validated path/URL or the default redirect
 *
 * @example
 * validateReturnUrl('https://staging-ottercamp.helloworlddao.com/otter-camp')
 *   // Returns: 'https://staging-ottercamp.helloworlddao.com/otter-camp' (trusted SSO)
 * validateReturnUrl('https://evil.com')     // Returns: '/' (default)
 * validateReturnUrl('//evil.com/phishing')  // Returns: '/' (default)
 * validateReturnUrl(null)                   // Returns: '/' (default)
 */
export function validateReturnUrl(url: string | null | undefined): string {
  if (!url) {
    return DEFAULT_REDIRECT;
  }

  try {
    // Decode URL-encoded payloads to catch bypass attempts
    const decoded = decodeURIComponent(url);

    // FAS-8.1: Allow absolute HTTPS URLs to trusted domains (cross-suite SSO)
    if (decoded.startsWith('https://') && isTrustedDomain(decoded)) {
      return decoded;
    }

    // Allow localhost HTTP URLs for local development (localhost, 127.0.0.1, [::1])
    if (decoded.startsWith('http://') && isLocalhostUrl(decoded)) {
      return decoded;
    }

    // Reject absolute URLs (http://, https://) to untrusted domains
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      console.warn('[Security] Rejected absolute redirect URL:', decoded);
      return DEFAULT_REDIRECT;
    }

    // Reject protocol-relative URLs (//) which browsers treat as absolute
    if (decoded.startsWith('//')) {
      console.warn('[Security] Rejected protocol-relative redirect URL:', decoded);
      return DEFAULT_REDIRECT;
    }

    // Reject dangerous URI schemes
    const lowerDecoded = decoded.toLowerCase();
    if (lowerDecoded.startsWith('data:') || lowerDecoded.startsWith('javascript:')) {
      console.warn('[Security] Rejected dangerous URI scheme:', decoded);
      return DEFAULT_REDIRECT;
    }

    // Must start with / to be a relative path
    if (!decoded.startsWith('/')) {
      console.warn('[Security] Rejected non-relative path:', decoded);
      return DEFAULT_REDIRECT;
    }

    // Validate against allowed prefixes
    const isAllowed = ALLOWED_PATH_PREFIXES.some(
      (prefix) => decoded === prefix || decoded.startsWith(prefix + '/')
    );

    if (!isAllowed) {
      // Allow root path as a special case — return default
      if (decoded === '/') {
        return DEFAULT_REDIRECT;
      }
      console.warn('[Security] Redirect path not in allowlist:', decoded);
      return DEFAULT_REDIRECT;
    }

    return decoded;
  } catch {
    // Handle malformed URL encoding
    console.warn('[Security] Failed to decode return URL:', url);
    return DEFAULT_REDIRECT;
  }
}

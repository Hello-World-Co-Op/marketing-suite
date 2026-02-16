/**
 * Tests for validateReturnUrl utility (marketing-suite)
 *
 * Mirrors foundery-os-suite tests with marketing-suite-specific
 * path prefixes and default redirect behavior.
 *
 * @see BL-012.1 - Return URL threading through registration flow
 * @see FOS-5.6.5 AC-5.6.5.1 - Open redirect vulnerability fix
 */

import type { MockInstance } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateReturnUrl } from '../validateReturnUrl';

describe('validateReturnUrl', () => {
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('valid relative paths (marketing-suite context)', () => {
    it('should accept /signup', () => {
      expect(validateReturnUrl('/signup')).toBe('/signup');
    });

    it('should accept /verify', () => {
      expect(validateReturnUrl('/verify')).toBe('/verify');
    });

    it('should accept /login', () => {
      expect(validateReturnUrl('/login')).toBe('/login');
    });

    it('should accept /link-identity', () => {
      expect(validateReturnUrl('/link-identity')).toBe('/link-identity');
    });

    it('should accept /dashboard', () => {
      expect(validateReturnUrl('/dashboard')).toBe('/dashboard');
    });

    it('should accept /mission-control', () => {
      expect(validateReturnUrl('/mission-control')).toBe('/mission-control');
    });

    it('should accept /otter-camp', () => {
      expect(validateReturnUrl('/otter-camp')).toBe('/otter-camp');
    });

    it('should accept /blog', () => {
      expect(validateReturnUrl('/blog')).toBe('/blog');
    });

    it('should accept nested paths under allowed prefixes', () => {
      expect(validateReturnUrl('/dashboard/captures/123')).toBe('/dashboard/captures/123');
      expect(validateReturnUrl('/otter-camp/game')).toBe('/otter-camp/game');
      expect(validateReturnUrl('/blog/some-post')).toBe('/blog/some-post');
    });
  });

  describe('trusted domain SSO redirects (cross-suite)', () => {
    it('should accept HTTPS URLs to *.helloworlddao.com', () => {
      expect(validateReturnUrl('https://staging-ottercamp.helloworlddao.com/otter-camp')).toBe(
        'https://staging-ottercamp.helloworlddao.com/otter-camp'
      );
    });

    it('should accept HTTPS URLs to helloworlddao.com root', () => {
      expect(validateReturnUrl('https://helloworlddao.com/dashboard')).toBe(
        'https://helloworlddao.com/dashboard'
      );
    });

    it('should accept HTTPS URLs to staging-governance.helloworlddao.com', () => {
      expect(validateReturnUrl('https://staging-governance.helloworlddao.com/discussions')).toBe(
        'https://staging-governance.helloworlddao.com/discussions'
      );
    });

    it('should accept HTTPS URLs to staging-portal.helloworlddao.com', () => {
      expect(validateReturnUrl('https://staging-portal.helloworlddao.com/dashboard')).toBe(
        'https://staging-portal.helloworlddao.com/dashboard'
      );
    });

    it('should reject HTTP URLs to trusted domains', () => {
      expect(validateReturnUrl('http://staging-portal.helloworlddao.com/dashboard')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected absolute redirect URL:',
        'http://staging-portal.helloworlddao.com/dashboard'
      );
    });

    it('should reject URLs to domains that end with but are not helloworlddao.com', () => {
      expect(validateReturnUrl('https://evil-helloworlddao.com/phishing')).toBe('/');
    });
  });

  describe('absolute URLs (CRITICAL security check)', () => {
    it('should reject https:// URLs to untrusted domains', () => {
      expect(validateReturnUrl('https://evil.com')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected absolute redirect URL:',
        'https://evil.com'
      );
    });

    it('should reject http:// URLs', () => {
      expect(validateReturnUrl('http://attacker.com')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected absolute redirect URL:',
        'http://attacker.com'
      );
    });

    it('should reject https://evil.com/phishing/page', () => {
      expect(validateReturnUrl('https://evil.com/phishing/page')).toBe('/');
    });
  });

  describe('protocol-relative URLs (CRITICAL security check)', () => {
    it('should reject //evil.com/phishing', () => {
      expect(validateReturnUrl('//evil.com/phishing')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected protocol-relative redirect URL:',
        '//evil.com/phishing'
      );
    });

    it('should reject //attacker.com', () => {
      expect(validateReturnUrl('//attacker.com')).toBe('/');
    });
  });

  describe('encoded URLs (bypass attempt prevention)', () => {
    it('should reject URL-encoded //evil.com (%2F%2Fevil.com)', () => {
      expect(validateReturnUrl('%2F%2Fevil.com')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected protocol-relative redirect URL:',
        '//evil.com'
      );
    });

    it('should reject URL-encoded https:// (%68%74%74%70%73%3A%2F%2Fevil.com)', () => {
      expect(validateReturnUrl('%68%74%74%70%73%3A%2F%2Fevil.com')).toBe('/');
    });

    it('should accept valid encoded paths', () => {
      expect(validateReturnUrl('%2Fdashboard')).toBe('/dashboard');
    });
  });

  describe('dangerous URI schemes', () => {
    it('should reject data: URIs', () => {
      expect(validateReturnUrl('data:text/html,<script>alert(1)</script>')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected dangerous URI scheme:',
        'data:text/html,<script>alert(1)</script>'
      );
    });

    it('should reject javascript: URIs', () => {
      expect(validateReturnUrl('javascript:alert(1)')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected dangerous URI scheme:',
        'javascript:alert(1)'
      );
    });

    it('should reject JAVASCRIPT: URIs (case-insensitive)', () => {
      expect(validateReturnUrl('JAVASCRIPT:alert(1)')).toBe('/');
    });

    it('should reject DATA: URIs (case-insensitive)', () => {
      expect(validateReturnUrl('DATA:text/html,test')).toBe('/');
    });
  });

  describe('non-relative paths', () => {
    it('should reject paths not starting with /', () => {
      expect(validateReturnUrl('dashboard')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Rejected non-relative path:',
        'dashboard'
      );
    });

    it('should reject paths starting with backslash', () => {
      expect(validateReturnUrl('\\evil.com')).toBe('/');
    });
  });

  describe('paths not in allowlist', () => {
    it('should reject /unknown-path', () => {
      expect(validateReturnUrl('/unknown-path')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Redirect path not in allowlist:',
        '/unknown-path'
      );
    });

    it('should return default for / (root path)', () => {
      expect(validateReturnUrl('/')).toBe('/');
    });

    it('should reject /api/sensitive', () => {
      expect(validateReturnUrl('/api/sensitive')).toBe('/');
    });
  });

  describe('null and undefined handling', () => {
    it('should return default for null', () => {
      expect(validateReturnUrl(null)).toBe('/');
    });

    it('should return default for undefined', () => {
      expect(validateReturnUrl(undefined)).toBe('/');
    });

    it('should return default for empty string', () => {
      expect(validateReturnUrl('')).toBe('/');
    });
  });

  describe('malformed encoding', () => {
    it('should handle malformed URL encoding gracefully', () => {
      // %ZZ is not valid URL encoding
      expect(validateReturnUrl('%ZZinvalid')).toBe('/');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Security] Failed to decode return URL:',
        '%ZZinvalid'
      );
    });
  });

  describe('BL-012.1: otter-camp specific URLs', () => {
    it('should accept otter-camp staging URL', () => {
      expect(validateReturnUrl('https://staging-ottercamp.helloworlddao.com/otter-camp')).toBe(
        'https://staging-ottercamp.helloworlddao.com/otter-camp'
      );
    });

    it('should accept otter-camp production URL', () => {
      expect(validateReturnUrl('https://ottercamp.helloworlddao.com/otter-camp')).toBe(
        'https://ottercamp.helloworlddao.com/otter-camp'
      );
    });

    it('should accept www.helloworlddao.com signup URL', () => {
      expect(validateReturnUrl('https://www.helloworlddao.com/signup')).toBe(
        'https://www.helloworlddao.com/signup'
      );
    });
  });
});

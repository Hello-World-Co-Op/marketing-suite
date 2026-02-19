/**
 * Register Page — returnTo Query Param Tests
 *
 * BL-012.1: Tests that Register.tsx correctly reads, validates,
 * and persists the returnTo query parameter in localStorage.
 *
 * These tests focus specifically on returnTo behavior.
 * Full Register.tsx component tests exist separately.
 *
 * @module Register.returnTo.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock heavy dependencies that Register.tsx imports
vi.mock('@/hooks/useUserService', () => ({
  useUserService: () => ({
    registerEmailPassword: vi.fn(),
  }),
}));

vi.mock('@/utils/crypto', () => ({
  hashEmail: vi.fn().mockResolvedValue('mock-hash'),
  encryptText: vi.fn().mockResolvedValue('mock-encrypted'),
}));

vi.mock('@/utils/recoveryKeys', () => ({
  generateMasterRecoveryKey: vi.fn(() => new Uint8Array(32)),
  generateSalt: vi.fn(() => new Uint8Array(16)),
  deriveKeyFromPassword: vi.fn().mockResolvedValue(new Uint8Array(32)),
  encryptRecoveryKey: vi.fn().mockResolvedValue('mock-encrypted-key'),
}));

vi.mock('@/utils/password-validation', () => ({
  passwordSchema: {
    _def: { typeName: 'ZodString' },
    safeParse: () => ({ success: true }),
    _parse: () => ({ status: 'valid', value: '' }),
    _type: 'ZodString',
    min: () => ({
      _def: { typeName: 'ZodString' },
      regex: () => ({
        _def: { typeName: 'ZodString' },
      }),
    }),
  },
  hashIpAddress: vi.fn().mockResolvedValue('mock-ip-hash'),
}));

vi.mock('@/components/PasswordStrengthMeter', () => ({
  PasswordStrengthMeter: () => null,
}));

vi.mock('@/components/DateOfBirthInput/DateOfBirthInput', () => ({
  __esModule: true,
  default: () => <div data-testid="dob-input">DOB Input</div>,
  getDaysInMonth: () => 31,
}));

// BL-005.5: Mock useIILogin
vi.mock('@hello-world-co-op/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hello-world-co-op/auth')>();
  return {
    ...actual,
    useIILogin: () => ({
      loginWithII: vi.fn(),
      isLoading: false,
    }),
  };
});

// We need to import AFTER mocks
import Register from '../Register';

const RETURN_TO_KEY = '__hw_return_to';

function renderRegister(path: string = '/signup') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Register />
    </MemoryRouter>
  );
}

describe('Register — returnTo query param (BL-012.1)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores validated returnTo URL in localStorage when a valid cross-suite URL is provided', () => {
    renderRegister('/signup?returnTo=https://staging-ottercamp.helloworlddao.com/otter-camp');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBe(
      'https://staging-ottercamp.helloworlddao.com/otter-camp'
    );
  });

  it('stores validated returnTo URL for production otter-camp', () => {
    renderRegister('/signup?returnTo=https://ottercamp.helloworlddao.com/otter-camp');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBe(
      'https://ottercamp.helloworlddao.com/otter-camp'
    );
  });

  it('stores validated returnTo URL for portal dashboard', () => {
    renderRegister('/signup?returnTo=https://staging-portal.helloworlddao.com/dashboard');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBe(
      'https://staging-portal.helloworlddao.com/dashboard'
    );
  });

  it('does NOT store returnTo when URL is to an untrusted domain', () => {
    renderRegister('/signup?returnTo=https://evil.com/phishing');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it('does NOT store returnTo when URL uses http:// protocol', () => {
    renderRegister('/signup?returnTo=http://staging-ottercamp.helloworlddao.com/otter-camp');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it('does NOT store returnTo when URL is a javascript: scheme', () => {
    renderRegister('/signup?returnTo=javascript:alert(1)');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it('does NOT store returnTo when URL is protocol-relative', () => {
    renderRegister('/signup?returnTo=//evil.com/phishing');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it('does NOT set localStorage when returnTo is missing', () => {
    renderRegister('/signup');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it('does NOT set localStorage when returnTo is empty', () => {
    renderRegister('/signup?returnTo=');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it('stores valid relative path returnTo in localStorage', () => {
    renderRegister('/signup?returnTo=/dashboard');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBe('/dashboard');
  });

  it('does NOT store invalid relative path returnTo (not in allowlist)', () => {
    renderRegister('/signup?returnTo=/some-random-page');

    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });
});

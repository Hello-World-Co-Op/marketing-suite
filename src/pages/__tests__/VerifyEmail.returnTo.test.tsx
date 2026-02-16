/**
 * VerifyEmail Page — returnTo Threading Tests
 *
 * BL-012.1: Tests that VerifyEmail.tsx reads returnTo from localStorage
 * and threads it to the appropriate login/link-identity URL after
 * successful email verification.
 *
 * @module VerifyEmail.returnTo.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const RETURN_TO_KEY = '__hw_return_to';

// Track navigation for link-identity path
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock verifyCode and resendVerificationCode
const mockVerifyCode = vi.fn();
const mockResendCode = vi.fn();

vi.mock('@/hooks/useUserService', () => ({
  useUserService: () => ({
    verifyCode: mockVerifyCode,
    resendVerificationCode: mockResendCode,
  }),
}));

// Mock VerificationCodeForm to simplify testing — just call onVerify directly
vi.mock('@/components/VerificationCodeForm', () => ({
  VerificationCodeForm: ({
    onVerify,
    email,
  }: {
    onVerify: (code: string) => Promise<void>;
    onResend: () => Promise<void>;
    onCancel: () => void;
    email: string;
  }) => (
    <div data-testid="verification-form">
      <span data-testid="email">{email}</span>
      <button
        data-testid="verify-btn"
        onClick={() => onVerify('123456')}
      >
        Verify
      </button>
    </div>
  ),
}));

// We need to import VerifyEmail AFTER mocks are set up
import VerifyEmail from '../VerifyEmail';

// Track window.location.href assignments
const originalLocation = window.location;

function renderVerifyEmail(path: string = '/verify?email=test@example.com') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/link-identity" element={<div>Link Identity Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('VerifyEmail — returnTo threading (BL-012.1)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  describe('auto-login succeeds (navigate to link-identity)', () => {
    beforeEach(() => {
      // Mock auto-login success: verifyCode succeeds, and fetch for auto-login returns success
      mockVerifyCode.mockResolvedValue({ success: true });

      // Mock fetch for autoLogin
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      }));

      // Set required env var for oracle URL
      vi.stubEnv('VITE_ORACLE_BRIDGE_URL', 'http://localhost:3000');

      // Set credentials in sessionStorage (required for autoLogin)
      sessionStorage.setItem('verify_credentials', JSON.stringify({
        email: 'test@example.com',
        password: 'testpass',
      }));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    it('navigates to /link-identity with returnTo when returnTo is in localStorage', async () => {
      localStorage.setItem(RETURN_TO_KEY, 'https://staging-ottercamp.helloworlddao.com/otter-camp');
      renderVerifyEmail();

      const user = userEvent.setup();
      await user.click(screen.getByTestId('verify-btn'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/link-identity?returnTo=https%3A%2F%2Fstaging-ottercamp.helloworlddao.com%2Fotter-camp'
        );
      });
    });

    it('navigates to /link-identity without returnTo when localStorage is empty', async () => {
      renderVerifyEmail();

      const user = userEvent.setup();
      await user.click(screen.getByTestId('verify-btn'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/link-identity');
      });
    });
  });

  describe('auto-login fails (redirect to foundery-os login)', () => {
    beforeEach(() => {
      mockVerifyCode.mockResolvedValue({ success: true });

      // Mock fetch for autoLogin — return failure
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: false }),
      }));

      // Set required env var
      vi.stubEnv('VITE_ORACLE_BRIDGE_URL', 'http://localhost:3000');

      // Set credentials
      sessionStorage.setItem('verify_credentials', JSON.stringify({
        email: 'test@example.com',
        password: 'testpass',
      }));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    it('redirects to foundery-os login with returnUrl when returnTo is in localStorage', async () => {
      localStorage.setItem(RETURN_TO_KEY, 'https://staging-ottercamp.helloworlddao.com/otter-camp');
      renderVerifyEmail();

      const user = userEvent.setup();
      await user.click(screen.getByTestId('verify-btn'));

      await waitFor(() => {
        expect(window.location.href).toContain('/login?returnUrl=');
        expect(window.location.href).toContain(
          encodeURIComponent('https://staging-ottercamp.helloworlddao.com/otter-camp')
        );
      });
    });

    it('redirects to foundery-os login with verified=true when no returnTo', async () => {
      renderVerifyEmail();

      const user = userEvent.setup();
      await user.click(screen.getByTestId('verify-btn'));

      await waitFor(() => {
        expect(window.location.href).toContain('/login?verified=true');
      });
    });
  });

  describe('auto-login not possible (no oracle URL)', () => {
    beforeEach(() => {
      mockVerifyCode.mockResolvedValue({ success: true });
      // No VITE_ORACLE_BRIDGE_URL — autoLogin returns false
    });

    it('redirects to foundery-os login with returnUrl when returnTo is in localStorage', async () => {
      localStorage.setItem(RETURN_TO_KEY, 'https://staging-ottercamp.helloworlddao.com/otter-camp');
      renderVerifyEmail();

      const user = userEvent.setup();
      await user.click(screen.getByTestId('verify-btn'));

      await waitFor(() => {
        expect(window.location.href).toContain('/login?returnUrl=');
        expect(window.location.href).toContain(
          encodeURIComponent('https://staging-ottercamp.helloworlddao.com/otter-camp')
        );
      });
    });

    it('redirects to foundery-os login with verified=true when no returnTo', async () => {
      renderVerifyEmail();

      const user = userEvent.setup();
      await user.click(screen.getByTestId('verify-btn'));

      await waitFor(() => {
        expect(window.location.href).toContain('/login?verified=true');
      });
    });
  });
});

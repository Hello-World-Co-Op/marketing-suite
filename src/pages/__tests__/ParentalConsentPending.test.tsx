/**
 * ParentalConsentPending Page Tests (BL-012.4)
 *
 * Tests for the consent pending confirmation page:
 * - Renders heading and explanation
 * - Resend button works and is rate-limited
 * - Error handling for resend failures
 * - Back to Login link present
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ParentalConsentPending from '../ParentalConsentPending';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderPage() {
  return render(
    <MemoryRouter>
      <ParentalConsentPending />
    </MemoryRouter>
  );
}

describe('ParentalConsentPending page (BL-012.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('renders the "Waiting for Parental Consent" heading', () => {
      renderPage();
      expect(screen.getByTestId('consent-pending-heading')).toHaveTextContent('Waiting for Parental Consent');
    });

    it('shows explanation about 7-day consent window', () => {
      renderPage();
      const explanation = screen.getByTestId('consent-explanation');
      expect(explanation).toHaveTextContent('7 days');
      expect(explanation).toHaveTextContent('consent request');
    });

    it('shows greeting with first name when available', () => {
      localStorage.setItem('verify_firstName', 'Alice');
      renderPage();
      expect(screen.getByText(/Hi Alice/)).toBeInTheDocument();
    });

    it('does NOT show greeting when first name is missing', () => {
      renderPage();
      expect(screen.queryByText(/Hi /)).not.toBeInTheDocument();
    });

    it('shows "Resend Consent Email" button', () => {
      renderPage();
      expect(screen.getByTestId('resend-consent-button')).toBeInTheDocument();
      expect(screen.getByTestId('resend-consent-button')).toHaveTextContent('Resend Consent Email');
    });

    it('shows "Back to Login" link', () => {
      renderPage();
      const link = screen.getByTestId('back-to-login-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('Back to Login');
    });
  });

  describe('Resend consent email', () => {
    it('calls resend endpoint when button is clicked', async () => {
      localStorage.setItem('__hw_pending_consent_user', 'user-123');
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      renderPage();
      fireEvent.click(screen.getByTestId('resend-consent-button'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/resend-consent'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ user_id: 'user-123' }),
          })
        );
      });
    });

    it('shows success toast after successful resend', async () => {
      localStorage.setItem('__hw_pending_consent_user', 'user-123');
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      renderPage();
      fireEvent.click(screen.getByTestId('resend-consent-button'));

      await waitFor(() => {
        // Check that the toast container was created
        const container = document.getElementById('toast-container');
        expect(container).toBeTruthy();
        expect(container?.textContent).toContain('Consent email resent successfully');
      });
    });

    it('shows remaining resend count after first resend', async () => {
      localStorage.setItem('__hw_pending_consent_user', 'user-123');
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      renderPage();
      fireEvent.click(screen.getByTestId('resend-consent-button'));

      await waitFor(() => {
        expect(screen.getByText(/2 resends remaining/)).toBeInTheDocument();
      });
    });

    it('disables button after 3 resend attempts', async () => {
      localStorage.setItem('__hw_pending_consent_user', 'user-123');

      renderPage();

      // Perform 3 successful resends sequentially, waiting for each to settle
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
        const button = screen.getByTestId('resend-consent-button');
        fireEvent.click(button);
        // Wait for this specific fetch call to be registered AND for the button
        // to be re-enabled (or disabled on the 3rd) before continuing
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledTimes(i + 1);
        });
        // Give React time to process the state update from the resolved fetch
        await new Promise((r) => setTimeout(r, 50));
      }

      await waitFor(() => {
        expect(screen.getByTestId('resend-consent-button')).toBeDisabled();
        expect(screen.getByTestId('max-resends-message')).toHaveTextContent(
          'Maximum resend attempts reached'
        );
      });
    });

    it('shows error when no user_id is in localStorage', async () => {
      // Do NOT set __hw_pending_consent_user
      renderPage();
      fireEvent.click(screen.getByTestId('resend-consent-button'));

      await waitFor(() => {
        const container = document.getElementById('toast-container');
        expect(container?.textContent).toContain('Unable to resend');
      });
    });

    it('shows error toast when resend API fails', async () => {
      localStorage.setItem('__hw_pending_consent_user', 'user-123');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });

      renderPage();
      fireEvent.click(screen.getByTestId('resend-consent-button'));

      await waitFor(() => {
        const container = document.getElementById('toast-container');
        expect(container?.textContent).toContain('Rate limit exceeded');
      });
    });

    it('shows generic error when fetch throws', async () => {
      localStorage.setItem('__hw_pending_consent_user', 'user-123');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderPage();
      fireEvent.click(screen.getByTestId('resend-consent-button'));

      await waitFor(() => {
        const container = document.getElementById('toast-container');
        expect(container?.textContent).toContain('Failed to resend');
      });
    });
  });
});

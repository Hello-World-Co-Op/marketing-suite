/**
 * ConsentLanding Page Tests (BL-012.4)
 *
 * Tests for the parent consent landing page:
 * - Token validation on mount
 * - Registrant info display (no PII)
 * - Approve and deny flows
 * - Expired token handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConsentLanding from '../ConsentLanding';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderPage(token: string = 'test-token-uuid') {
  return render(
    <MemoryRouter initialEntries={[`/consent?token=${token}`]}>
      <ConsentLanding />
    </MemoryRouter>
  );
}

function renderPageNoToken() {
  return render(
    <MemoryRouter initialEntries={['/consent']}>
      <ConsentLanding />
    </MemoryRouter>
  );
}

describe('ConsentLanding page (BL-012.4)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token validation', () => {
    it('shows loading state while validating token', () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
      renderPage();
      expect(screen.getByTestId('consent-loading')).toHaveTextContent('Validating consent request');
    });

    it('shows error when no token is provided', () => {
      renderPageNoToken();
      expect(screen.getByTestId('consent-error-message')).toHaveTextContent('No consent token provided');
    });

    it('shows registrant info after successful token validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            first_name: 'Alice',
            age_range: '13-17',
            registration_date: '2026-02-16',
          }),
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-review-heading')).toHaveTextContent('Parental Consent Request');
      });

      const info = screen.getByTestId('registrant-info');
      expect(info).toHaveTextContent('Alice');
      expect(info).toHaveTextContent('13-17');
      expect(info).toHaveTextContent('2026-02-16');
    });

    it('shows expired token message for 410 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
        json: () => Promise.resolve({ error: 'Token expired' }),
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-expired-heading')).toHaveTextContent('Consent Link Expired');
      });
    });

    it('shows expired token message when error contains "expired"', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Consent token has expired' }),
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-expired-heading')).toHaveTextContent('Consent Link Expired');
      });
    });

    it('shows generic error for other API failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-error-message')).toHaveTextContent('Internal server error');
      });
    });

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-error-message')).toHaveTextContent('Unable to connect');
      });
    });
  });

  describe('Approve flow', () => {
    it('shows approve and deny buttons when token is valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            first_name: 'Alice',
            age_range: '13-17',
            registration_date: '2026-02-16',
          }),
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-approve-button')).toBeInTheDocument();
        expect(screen.getByTestId('consent-deny-button')).toBeInTheDocument();
      });
    });

    it('calls approve endpoint when Approve button is clicked', async () => {
      // First call: token validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            first_name: 'Alice',
            age_range: '13-17',
            registration_date: '2026-02-16',
          }),
      });

      renderPage('my-consent-token');

      await waitFor(() => {
        expect(screen.getByTestId('consent-approve-button')).toBeInTheDocument();
      });

      // Second call: approve
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      fireEvent.click(screen.getByTestId('consent-approve-button'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('/api/auth/consent/my-consent-token/approve'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('shows success page after approval', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              first_name: 'Alice',
              age_range: '13-17',
              registration_date: '2026-02-16',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-approve-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('consent-approve-button'));

      await waitFor(() => {
        expect(screen.getByTestId('consent-approved-heading')).toHaveTextContent('Account Activated');
      });

      // Should have login link
      expect(screen.getByTestId('consent-login-link')).toBeInTheDocument();
    });
  });

  describe('Deny flow', () => {
    it('calls deny endpoint when Deny button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            first_name: 'Alice',
            age_range: '13-17',
            registration_date: '2026-02-16',
          }),
      });

      renderPage('my-consent-token');

      await waitFor(() => {
        expect(screen.getByTestId('consent-deny-button')).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      fireEvent.click(screen.getByTestId('consent-deny-button'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('/api/auth/consent/my-consent-token/deny'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('shows neutral denial page without shame/blame language', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              first_name: 'Alice',
              age_range: '13-17',
              registration_date: '2026-02-16',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-deny-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('consent-deny-button'));

      await waitFor(() => {
        expect(screen.getByTestId('consent-denied-heading')).toHaveTextContent('Consent Not Granted');
      });

      // Should be neutral, not blaming
      expect(screen.getByText(/Your response has been recorded/)).toBeInTheDocument();
    });
  });

  describe('Expired token during action', () => {
    it('shows expired message when approve returns 410', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              first_name: 'Alice',
              age_range: '13-17',
              registration_date: '2026-02-16',
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 410,
          json: () => Promise.resolve({ error: 'Token expired' }),
        });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('consent-approve-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('consent-approve-button'));

      await waitFor(() => {
        expect(screen.getByTestId('consent-expired-heading')).toBeInTheDocument();
      });
    });
  });

  describe('Privacy compliance', () => {
    it('does NOT display registrant email on consent page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            first_name: 'Alice',
            age_range: '13-17',
            registration_date: '2026-02-16',
          }),
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('registrant-info')).toBeInTheDocument();
      });

      // Should NOT show any email-like text in the registrant info
      const infoText = screen.getByTestId('registrant-info').textContent || '';
      expect(infoText).not.toMatch(/@/);
    });

    it('links to privacy policy from consent page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            first_name: 'Alice',
            age_range: '13-17',
            registration_date: '2026-02-16',
          }),
      });

      renderPage();

      await waitFor(() => {
        const link = screen.getByText('Privacy Policy');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/privacy-policy');
      });
    });
  });
});

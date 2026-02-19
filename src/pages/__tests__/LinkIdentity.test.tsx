import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Use vi.hoisted to create mock fns that can be referenced in vi.mock factory
const { mockLogin, mockGetIdentity, mockCreate, mockValidateReturnUrl } = vi.hoisted(() => {
  const mockLogin = vi.fn();
  const mockGetIdentity = vi.fn();
  const mockCreate = vi.fn();
  const mockValidateReturnUrl = vi.fn((url: string, opts: { defaultRedirect: string }) => {
    // Simple mock: return the URL if it's a trusted domain, otherwise default
    if (url.includes('helloworlddao.com') || url.includes('localhost')) return url;
    return opts.defaultRedirect;
  });
  return { mockLogin, mockGetIdentity, mockCreate, mockValidateReturnUrl };
});

vi.mock('@dfinity/auth-client', () => ({
  AuthClient: { create: mockCreate },
}));

vi.mock('@hello-world-co-op/auth', () => ({
  validateReturnUrl: mockValidateReturnUrl,
}));

import LinkIdentity from '../LinkIdentity';

// Track window.location.href assignments via a persistent mock object
const mockLocation = { href: '', assign: vi.fn(), replace: vi.fn(), reload: vi.fn() } as unknown as Location;

function renderLinkIdentity(route = '/link-identity') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LinkIdentity />
    </MemoryRouter>
  );
}

describe('LinkIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';

    // Set env vars needed by the component
    import.meta.env.VITE_ORACLE_BRIDGE_URL = 'https://oracle.test.com';
    import.meta.env.VITE_DAO_SUITE_URL = 'https://portal.test.com';

    mockCreate.mockResolvedValue({
      login: mockLogin,
      getIdentity: mockGetIdentity,
    });

    // Replace window.location with our mock
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: mockLocation,
    });

    // Default: session check returns not authenticated (no ic_principal)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({ authenticated: false }),
    } as Response);
  });

  it('renders the page with title and benefits', () => {
    renderLinkIdentity();

    expect(screen.getByText('Link Your Internet Identity')).toBeInTheDocument();
    expect(screen.getByText('Token Balance')).toBeInTheDocument();
    expect(screen.getByText('Governance Voting')).toBeInTheDocument();
    expect(screen.getByText('NFT Ownership')).toBeInTheDocument();
    expect(screen.getByText('Self-Custody')).toBeInTheDocument();
  });

  it('renders the link button (no skip button)', () => {
    renderLinkIdentity();

    expect(screen.getByRole('button', { name: /link internet identity to continue/i })).toBeInTheDocument();
    // Skip button should NOT exist after BL-005.4
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
  });

  it('has accessible benefits list', () => {
    renderLinkIdentity();

    const list = screen.getByRole('list', { name: /benefits/i });
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('link button triggers II auth flow', async () => {
    mockLogin.mockImplementation(() => Promise.resolve());

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity to continue/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          identityProvider: 'https://identity.ic0.app',
        })
      );
    });
  });

  it('shows connecting state during linking', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity to continue/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  it('shows success message after successful linking', async () => {
    mockGetIdentity.mockReturnValue({
      getPrincipal: () => ({ toText: () => 'abc-123-def' }),
    });

    mockLogin.mockImplementation(async ({ onSuccess }: { onSuccess: () => Promise<void> }) => {
      await onSuccess();
    });

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: false }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      } as Response);

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity to continue/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByText('Internet Identity linked successfully!')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    mockGetIdentity.mockReturnValue({
      getPrincipal: () => ({ toText: () => 'abc-123-def' }),
    });

    mockLogin.mockImplementation(async ({ onSuccess }: { onSuccess: () => Promise<void> }) => {
      await onSuccess();
    });

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: false }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, message: 'Principal already in use' }),
      } as Response);

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity to continue/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Principal already in use')).toBeInTheDocument();
    });
  });

  it('shows error when II auth is cancelled', async () => {
    mockLogin.mockImplementation(async ({ onError }: { onError: (err: string) => void }) => {
      onError('User cancelled');
    });

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity to continue/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('renders "Having trouble?" help link instead of skip note', () => {
    renderLinkIdentity();

    const helpLink = screen.getByRole('link', { name: /having trouble/i });
    expect(helpLink).toBeInTheDocument();
    expect(helpLink).toHaveAttribute('href', 'https://internetcomputer.org/docs/building-apps/authentication/internet-identity');
    expect(helpLink).toHaveAttribute('target', '_blank');

    // Old "link later from settings" note should NOT exist
    expect(screen.queryByText(/you can always link your internet identity later/i)).not.toBeInTheDocument();
  });

  it('disables link button during linking', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity to continue/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(linkButton).toBeDisabled();
    });
  });

  it('redirects to dashboard if user already has II linked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ authenticated: true, ic_principal: 'abc-123-def' }),
    } as Response);

    renderLinkIdentity();

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://portal.test.com/dashboard?ii_linked=true');
    });
  });

  it('uses returnUrl from query params for redirect after successful linking', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockGetIdentity.mockReturnValue({
      getPrincipal: () => ({ toText: () => 'abc-123-def' }),
    });

    mockLogin.mockImplementation(async ({ onSuccess }: { onSuccess: () => Promise<void> }) => {
      await onSuccess();
    });

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: false }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      } as Response);

    // Render with returnUrl in query params
    renderLinkIdentity('/link-identity?returnUrl=https%3A%2F%2Fstaging-governance.helloworlddao.com%2Fvoting');

    const linkButton = screen.getByRole('button', { name: /link internet identity to continue/i });
    fireEvent.click(linkButton);

    // Verify success message appears
    await waitFor(() => {
      expect(screen.getByText('Internet Identity linked successfully!')).toBeInTheDocument();
    });

    // Advance past the setTimeout (1500ms) to trigger the redirect
    await vi.advanceTimersByTimeAsync(2000);

    // Verify validateReturnUrl was called with the returnUrl from query params
    expect(mockValidateReturnUrl).toHaveBeenCalledWith(
      'https://staging-governance.helloworlddao.com/voting',
      expect.objectContaining({ defaultRedirect: expect.stringContaining('dashboard') })
    );

    vi.useRealTimers();
  });

  it('uses returnUrl for redirect when user already has II linked', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ authenticated: true, ic_principal: 'abc-123-def' }),
    } as Response);

    renderLinkIdentity('/link-identity?returnUrl=https%3A%2F%2Fstaging-portal.helloworlddao.com%2Fproposals');

    // Wait for the fetch to be called (session check in useEffect)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/session'),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    // Verify validateReturnUrl was called with the returnUrl
    expect(mockValidateReturnUrl).toHaveBeenCalledWith(
      'https://staging-portal.helloworlddao.com/proposals',
      expect.objectContaining({ defaultRedirect: expect.stringContaining('dashboard') })
    );
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Use vi.hoisted to create mock fns that can be referenced in vi.mock factory
const { mockLogin, mockGetIdentity, mockCreate } = vi.hoisted(() => {
  const mockLogin = vi.fn();
  const mockGetIdentity = vi.fn();
  const mockCreate = vi.fn();
  return { mockLogin, mockGetIdentity, mockCreate };
});

vi.mock('@dfinity/auth-client', () => ({
  AuthClient: { create: mockCreate },
}));

import LinkIdentity from '../LinkIdentity';

// Track window.location.href assignments via a persistent mock object
const mockLocation = { href: '', assign: vi.fn(), replace: vi.fn(), reload: vi.fn() } as unknown as Location;

function renderLinkIdentity() {
  return render(
    <MemoryRouter initialEntries={['/link-identity']}>
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

  it('renders the link button and skip button', () => {
    renderLinkIdentity();

    expect(screen.getByRole('button', { name: /link internet identity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
  });

  it('has accessible benefits list', () => {
    renderLinkIdentity();

    const list = screen.getByRole('list', { name: /benefits/i });
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('skip button sets window.location.href to dao-suite URL', () => {
    renderLinkIdentity();

    const skipButton = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipButton);

    expect(mockLocation.href).toBe('https://portal.test.com');
  });

  it('link button triggers II auth flow', async () => {
    mockLogin.mockImplementation(() => Promise.resolve());

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity/i });
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

    const linkButton = screen.getByRole('button', { name: /link internet identity/i });
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

    const linkButton = screen.getByRole('button', { name: /link internet identity/i });
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

    const linkButton = screen.getByRole('button', { name: /link internet identity/i });
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

    const linkButton = screen.getByRole('button', { name: /link internet identity/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows info note about linking later', () => {
    renderLinkIdentity();

    expect(
      screen.getByText(/you can always link your internet identity later from settings/i)
    ).toBeInTheDocument();
  });

  it('disables buttons during linking', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderLinkIdentity();

    const linkButton = screen.getByRole('button', { name: /link internet identity/i });
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /skip/i })).toBeDisabled();
    });
  });

  it('redirects to dashboard if user already has II linked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ authenticated: true, ic_principal: 'abc-123-def' }),
    } as Response);

    renderLinkIdentity();

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://portal.test.com');
    });
  });
});

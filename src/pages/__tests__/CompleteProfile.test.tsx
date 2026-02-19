import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CompleteProfile from '../CompleteProfile';

// Track window.location.href assignments via a persistent mock object
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
} as unknown as Location;

function renderCompleteProfile() {
  return render(
    <MemoryRouter initialEntries={['/complete-profile']}>
      <CompleteProfile />
    </MemoryRouter>
  );
}

describe('CompleteProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';

    // Set env vars needed by the component
    import.meta.env.VITE_ORACLE_BRIDGE_URL = 'https://oracle.test.com';
    import.meta.env.VITE_DAO_SUITE_URL = 'https://portal.test.com';
    import.meta.env.VITE_FOUNDERY_OS_URL = 'https://foundery.test.com';

    // Replace window.location with our mock
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: mockLocation,
    });

    // Default: session check returns authenticated but profile NOT complete
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({ authenticated: true, profile_complete: false }),
    } as Response);
  });

  it('renders the page with title and form fields', () => {
    renderCompleteProfile();

    expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/month/i)).toBeInTheDocument(); // DOB component present
  });

  it('renders the submit button', () => {
    renderCompleteProfile();

    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
  });

  it('shows COPPA privacy notice', () => {
    renderCompleteProfile();

    expect(
      screen.getByText(/children's online privacy protection/i)
    ).toBeInTheDocument();
  });

  it('shows info note about secure storage', () => {
    renderCompleteProfile();

    expect(
      screen.getByText(/your information is stored securely/i)
    ).toBeInTheDocument();
  });

  it('redirects to login if not authenticated', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ authenticated: false }),
    } as Response);

    renderCompleteProfile();

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://foundery.test.com');
    });
  });

  it('redirects to dashboard if profile is already complete', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ authenticated: true, profile_complete: true }),
    } as Response);

    renderCompleteProfile();

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://portal.test.com');
    });
  });

  it('shows email validation error for invalid email', async () => {
    renderCompleteProfile();

    const emailInput = screen.getByLabelText(/email address/i);
    await userEvent.type(emailInput, 'not-an-email');
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('shows display name validation error when empty', async () => {
    renderCompleteProfile();

    // Select a valid adult DOB (year 1990, January 1) so ageStatus becomes 'adult'
    // and the submit button is enabled before clicking it
    const monthSelect = screen.getByLabelText(/month/i);
    await userEvent.selectOptions(monthSelect, '1');

    const daySelect = screen.getByLabelText(/day/i);
    await userEvent.selectOptions(daySelect, '1');

    const yearSelect = screen.getByLabelText(/year/i);
    await userEvent.selectOptions(yearSelect, '1990');

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
    });
  });

  it('disables submit button when age is blocked (under 13)', async () => {
    renderCompleteProfile();

    // Select month, day, year for a 10-year-old
    const currentYear = new Date().getFullYear();
    const yearForAge10 = currentYear - 10;

    // Find the month select and set to January
    const monthSelect = screen.getByLabelText(/month/i);
    await userEvent.selectOptions(monthSelect, '1');

    // Find the day select and set to 1
    const daySelect = screen.getByLabelText(/day/i);
    await userEvent.selectOptions(daySelect, '1');

    // Find the year select and set to age 10
    const yearSelect = screen.getByLabelText(/year/i);
    await userEvent.selectOptions(yearSelect, String(yearForAge10));

    await waitFor(() => {
      expect(screen.getByText(/you must be at least 13 years old/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows parental consent field for minors (13-17)', async () => {
    renderCompleteProfile();

    const currentYear = new Date().getFullYear();
    const yearForAge15 = currentYear - 15;

    const monthSelect = screen.getByLabelText(/month/i);
    await userEvent.selectOptions(monthSelect, '1');

    const daySelect = screen.getByLabelText(/day/i);
    await userEvent.selectOptions(daySelect, '1');

    const yearSelect = screen.getByLabelText(/year/i);
    await userEvent.selectOptions(yearSelect, String(yearForAge15));

    await waitFor(() => {
      expect(screen.getByLabelText(/parent\/guardian email/i)).toBeInTheDocument();
      expect(screen.getByText(/a parent or guardian must approve/i)).toBeInTheDocument();
    });
  });

  it('shows adult eligibility message for 18+', async () => {
    renderCompleteProfile();

    const currentYear = new Date().getFullYear();
    const yearForAge25 = currentYear - 25;

    const monthSelect = screen.getByLabelText(/month/i);
    await userEvent.selectOptions(monthSelect, '1');

    const daySelect = screen.getByLabelText(/day/i);
    await userEvent.selectOptions(daySelect, '1');

    const yearSelect = screen.getByLabelText(/year/i);
    await userEvent.selectOptions(yearSelect, String(yearForAge25));

    await waitFor(() => {
      expect(screen.getByText(/eligible for full dao membership/i)).toBeInTheDocument();
    });
  });

  it('submits profile successfully for adult user', async () => {
    const currentYear = new Date().getFullYear();
    const yearForAge25 = currentYear - 25;

    // Session check first, then profile submission
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, profile_complete: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          profile_complete: true,
          redirect: 'https://portal.test.com',
        }),
      } as Response);

    renderCompleteProfile();

    // Fill DOB
    const monthSelect = screen.getByLabelText(/month/i);
    await userEvent.selectOptions(monthSelect, '1');
    const daySelect = screen.getByLabelText(/day/i);
    await userEvent.selectOptions(daySelect, '15');
    const yearSelect = screen.getByLabelText(/year/i);
    await userEvent.selectOptions(yearSelect, String(yearForAge25));

    // Fill email
    const emailInput = screen.getByLabelText(/email address/i);
    await userEvent.type(emailInput, 'test@example.com');

    // Fill display name
    const displayNameInput = screen.getByLabelText(/display name/i);
    await userEvent.type(displayNameInput, 'TestUser');

    // Submit
    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Profile completed successfully!')).toBeInTheDocument();
    });
  });

  it('shows error on server rejection (409 email in use)', async () => {
    const currentYear = new Date().getFullYear();
    const yearForAge25 = currentYear - 25;

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, profile_complete: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          message: 'Email already in use. Please use a different email address.',
        }),
      } as Response);

    renderCompleteProfile();

    // Fill DOB
    const monthSelect = screen.getByLabelText(/month/i);
    await userEvent.selectOptions(monthSelect, '1');
    const daySelect = screen.getByLabelText(/day/i);
    await userEvent.selectOptions(daySelect, '15');
    const yearSelect = screen.getByLabelText(/year/i);
    await userEvent.selectOptions(yearSelect, String(yearForAge25));

    // Fill form
    const emailInput = screen.getByLabelText(/email address/i);
    await userEvent.type(emailInput, 'taken@example.com');
    const displayNameInput = screen.getByLabelText(/display name/i);
    await userEvent.type(displayNameInput, 'TestUser');

    // Submit
    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
    });
  });

  it('has accessible form with aria labels', () => {
    renderCompleteProfile();

    const form = screen.getByRole('form', { name: /complete your profile form/i });
    expect(form).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('aria-required', 'true');

    const displayNameInput = screen.getByLabelText(/display name/i);
    expect(displayNameInput).toHaveAttribute('aria-required', 'true');
  });
});

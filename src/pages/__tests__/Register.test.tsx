import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register, { calculateAge, registrationSchema } from '../Register';

// Mock useUserService — capture registerEmailPassword args for verification
const mockRegisterEmailPassword = vi.fn().mockResolvedValue({
  Ok: { success: true, message: 'Account created' },
});

vi.mock('@/hooks/useUserService', () => ({
  useUserService: () => ({
    registerEmailPassword: mockRegisterEmailPassword,
    submitIndividual: vi.fn(),
    verifyCode: vi.fn(),
    resendVerificationCode: vi.fn(),
    getStats: vi.fn(),
  }),
}));

// BL-005.5: Mock useIILogin
const mockIILoginWithII = vi.fn();

vi.mock('@hello-world-co-op/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hello-world-co-op/auth')>();
  return {
    ...actual,
    useIILogin: () => ({
      loginWithII: mockIILoginWithII,
      isLoading: false,
    }),
  };
});

// Mock crypto utilities
vi.mock('@/utils/crypto', () => ({
  hashEmail: vi.fn().mockResolvedValue('mockedhash'),
  encryptText: vi.fn().mockResolvedValue('mockedencrypted'),
}));

vi.mock('@/utils/recoveryKeys', () => ({
  generateMasterRecoveryKey: vi.fn(() => new Uint8Array(32)),
  generateSalt: vi.fn(() => new Uint8Array(16)),
  deriveKeyFromPassword: vi.fn().mockResolvedValue({} as CryptoKey),
  encryptRecoveryKey: vi.fn().mockResolvedValue('mockedencryptedkey'),
}));

vi.mock('@/utils/password-validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/password-validation')>();
  return {
    ...actual,
    hashIpAddress: vi.fn().mockResolvedValue('mockediphash'),
  };
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

describe('calculateAge', () => {
  it('calculates correct age for a past birthday this year', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    const age = calculateAge(birthYear, 1, 1);
    // If today is after Jan 1, age should be 25; if before, 24
    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });

  it('calculates age correctly when birthday has not yet occurred this year', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 20;
    // Set birthday to December 31 (almost certainly in the future unless today is Dec 31)
    const age = calculateAge(birthYear, 12, 31);
    if (today.getMonth() === 11 && today.getDate() >= 31) {
      expect(age).toBe(20);
    } else {
      expect(age).toBe(19);
    }
  });

  it('returns 0 for someone born this year', () => {
    const today = new Date();
    const age = calculateAge(today.getFullYear(), today.getMonth() + 1, today.getDate());
    expect(age).toBe(0);
  });
});

describe('registrationSchema', () => {
  const validData = {
    dobMonth: 6,
    dobDay: 15,
    dobYear: 1990,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'MyP@ssw0rd!23',
    confirmPassword: 'MyP@ssw0rd!23',
  };

  it('validates valid registration data', () => {
    const result = registrationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registrationSchema.safeParse({
      ...validData,
      confirmPassword: 'DifferentPassword1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid DOB (Feb 30)', () => {
    const result = registrationSchema.safeParse({
      ...validData,
      dobMonth: 2,
      dobDay: 30,
      dobYear: 2000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects under-13 users', () => {
    const today = new Date();
    const result = registrationSchema.safeParse({
      ...validData,
      dobYear: today.getFullYear() - 10,
      dobMonth: today.getMonth() + 1,
      dobDay: today.getDate(),
    });
    expect(result.success).toBe(false);
  });
});

describe('Register page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the registration form with DOB as first field', () => {
    renderRegister();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText(/COPPA/)).toBeInTheDocument();
  });

  it('shows DOB dropdowns', () => {
    renderRegister();
    expect(screen.getByTestId('dob-month')).toBeInTheDocument();
    expect(screen.getByTestId('dob-day')).toBeInTheDocument();
    expect(screen.getByTestId('dob-year')).toBeInTheDocument();
  });

  it('does not show PII fields until DOB age gate passes', () => {
    renderRegister();
    // Before DOB is filled, name/email/password fields should not be visible
    expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('shows form fields after entering adult DOB', () => {
    renderRegister();

    // Select a DOB that makes the user 25 years old
    const birthYear = new Date().getFullYear() - 25;
    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: String(birthYear) } });

    // Now the form fields should appear
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
    expect(screen.getByText(/eligible for full membership/)).toBeInTheDocument();
  });

  it('shows minor message for 13-17 year olds', () => {
    renderRegister();

    const birthYear = new Date().getFullYear() - 15;
    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: String(birthYear) } });

    expect(screen.getByText(/Full membership.*requires age 18\+/)).toBeInTheDocument();
  });

  it('blocks under-13 users and sets localStorage', () => {
    renderRegister();

    const birthYear = new Date().getFullYear() - 10;
    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: String(birthYear) } });

    expect(screen.getByTestId('age-block-message')).toBeInTheDocument();
    expect(screen.getByText(/at least 13 years old/)).toBeInTheDocument();

    // Verify localStorage was set
    const stored = localStorage.getItem('__hw_age_block');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.blocked_at).toBeDefined();
  });

  it('shows blocked screen when localStorage block is active', () => {
    // Set the block in localStorage
    localStorage.setItem('__hw_age_block', JSON.stringify({ blocked_at: Date.now() }));

    renderRegister();

    expect(screen.getByTestId('age-block-message')).toBeInTheDocument();
    expect(screen.getByText('Return to Home')).toBeInTheDocument();
  });

  it('clears expired localStorage block', () => {
    // Set expired block (more than 24 hours ago)
    const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    localStorage.setItem('__hw_age_block', JSON.stringify({ blocked_at: expiredTimestamp }));

    renderRegister();

    // Should NOT show the blocked screen
    expect(screen.queryByTestId('age-block-message')).not.toBeInTheDocument();
    // localStorage should be cleared
    expect(localStorage.getItem('__hw_age_block')).toBeNull();
  });

  it('shows "Sign in" link', () => {
    renderRegister();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('shows privacy notice', () => {
    renderRegister();
    expect(screen.getByText(/encrypted client-side/)).toBeInTheDocument();
  });

  it('sends display_name with firstName in registration request (BL-028.2)', async () => {
    renderRegister();

    // Pass age gate
    const birthYear = new Date().getFullYear() - 25;
    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: String(birthYear) } });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'MyP@ssw0rd!23' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/), { target: { value: 'MyP@ssw0rd!23' } });

    // Submit via button role
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mockRegisterEmailPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: ['Alice'],
        })
      );
    });
  });

  it('shows display name helper text on firstName field (BL-028.2)', () => {
    renderRegister();

    const birthYear = new Date().getFullYear() - 25;
    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: String(birthYear) } });

    expect(screen.getByText('Your first name will be your public display name')).toBeInTheDocument();
  });

  it('renders optional fields toggle after age gate', async () => {
    renderRegister();

    const birthYear = new Date().getFullYear() - 25;
    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: String(birthYear) } });

    const toggleButton = screen.getByText('Tell us more (optional)');
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Company')).toBeInTheDocument();
      expect(screen.getByLabelText('Job Title')).toBeInTheDocument();
      expect(screen.getByLabelText('What interests you most?')).toBeInTheDocument();
      expect(screen.getByLabelText('How did you hear about us?')).toBeInTheDocument();
    });
  });
});

describe('BL-005.5: Internet Identity on Register page', () => {
  beforeEach(() => {
    mockIILoginWithII.mockReset();
  });

  it('renders Continue with Internet Identity button', () => {
    renderRegister();

    const iiButton = screen.getByTestId('ii-register-button');
    expect(iiButton).toBeInTheDocument();
    expect(iiButton).toHaveTextContent(/continue with internet identity/i);
  });

  it('calls loginWithII when II button is clicked', async () => {
    renderRegister();

    fireEvent.click(screen.getByTestId('ii-register-button'));

    expect(mockIILoginWithII).toHaveBeenCalledTimes(1);
  });

  it('renders "Or register with email" divider', () => {
    renderRegister();

    expect(screen.getByText('Or register with email')).toBeInTheDocument();
  });
});

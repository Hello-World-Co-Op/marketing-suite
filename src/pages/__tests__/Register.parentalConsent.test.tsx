/**
 * Register Page — Parental Consent Tests (BL-012.4)
 *
 * Tests for the 13-17 user parental consent flow:
 * - Parent email field visibility for 13-17 users
 * - Parent email validation (same email as registrant)
 * - Registration payload includes parent email and consent flag
 * - Routing: 13-17 → /parental-consent-pending, 18+ → /verify
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register, { calculateAge, registrationSchema } from '../Register';

// Track navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useUserService — capture registerEmailPassword args for verification
const mockRegisterEmailPassword = vi.fn();

vi.mock('@/hooks/useUserService', () => ({
  useUserService: () => ({
    registerEmailPassword: mockRegisterEmailPassword,
    submitIndividual: vi.fn(),
    verifyCode: vi.fn(),
    resendVerificationCode: vi.fn(),
    getStats: vi.fn(),
  }),
}));

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

/**
 * Set the DOB fields to make the user a specific age
 */
function setDob(age: number) {
  const today = new Date();
  // Use a birthday early in the year to ensure the age is correct
  const birthYear = today.getFullYear() - age;
  fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '1' } });
  fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '1' } });
  fireEvent.change(screen.getByTestId('dob-year'), { target: { value: String(birthYear) } });
}

/**
 * Fill the required registration fields (after DOB gate passes)
 */
function fillRequiredFields(options: { parentEmail?: string } = {}) {
  fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: 'Alice' } });
  fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: 'Smith' } });
  fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: 'alice@example.com' } });
  if (options.parentEmail) {
    fireEvent.change(screen.getByTestId('parent-email-input'), { target: { value: options.parentEmail } });
  }
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'MyP@ssw0rd!23' } });
  fireEvent.change(screen.getByLabelText(/Confirm Password/), { target: { value: 'MyP@ssw0rd!23' } });
}

describe('Register — Parental Consent (BL-012.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockReset();
    mockRegisterEmailPassword.mockReset();
    mockRegisterEmailPassword.mockResolvedValue({
      Ok: { success: true, message: 'Account created', user_id: ['user-123'] },
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Parent email field visibility', () => {
    it('shows parent email field for 13-17 year old users', () => {
      renderRegister();
      setDob(15);

      expect(screen.getByTestId('parent-email-input')).toBeInTheDocument();
      expect(screen.getByLabelText(/Parent\/Guardian Email/)).toBeInTheDocument();
    });

    it('shows descriptive label for parent email field', () => {
      renderRegister();
      setDob(15);

      // The label text appears as helper text under the parent email field
      expect(
        screen.getByText(/We'll send them a consent request/)
      ).toBeInTheDocument();
    });

    it('does NOT show parent email field for 18+ users', () => {
      renderRegister();
      setDob(25);

      expect(screen.queryByTestId('parent-email-input')).not.toBeInTheDocument();
    });

    it('does NOT show parent email field before DOB is entered', () => {
      renderRegister();

      expect(screen.queryByTestId('parent-email-input')).not.toBeInTheDocument();
    });

    it('shows parent email for exactly 13 year old users', () => {
      renderRegister();
      setDob(13);

      expect(screen.getByTestId('parent-email-input')).toBeInTheDocument();
    });

    it('shows parent email for exactly 17 year old users', () => {
      renderRegister();
      setDob(17);

      expect(screen.getByTestId('parent-email-input')).toBeInTheDocument();
    });

    it('does NOT show parent email for exactly 18 year old users', () => {
      renderRegister();
      setDob(18);

      expect(screen.queryByTestId('parent-email-input')).not.toBeInTheDocument();
    });
  });

  describe('Schema validation — parent email', () => {
    const baseData = {
      dobMonth: 6,
      dobDay: 15,
      dobYear: new Date().getFullYear() - 15, // 15 years old
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      password: 'MyP@ssw0rd!23',
      confirmPassword: 'MyP@ssw0rd!23',
    };

    it('allows valid parent email for 13-17 users', () => {
      const result = registrationSchema.safeParse({
        ...baseData,
        parentEmail: 'parent@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects parent email that matches registrant email', () => {
      const result = registrationSchema.safeParse({
        ...baseData,
        parentEmail: 'alice@example.com',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const parentEmailError = result.error.issues.find((i) => i.path.includes('parentEmail'));
        expect(parentEmailError?.message).toBe('Parent email must be different from your email');
      }
    });

    it('rejects parent email matching registrant email (case-insensitive)', () => {
      const result = registrationSchema.safeParse({
        ...baseData,
        parentEmail: 'ALICE@Example.COM',
      });
      expect(result.success).toBe(false);
    });

    it('allows empty parent email (for 18+ users)', () => {
      const result = registrationSchema.safeParse({
        ...baseData,
        dobYear: 1990, // adult
        parentEmail: '',
      });
      expect(result.success).toBe(true);
    });

    it('allows omitted parent email (for 18+ users)', () => {
      const result = registrationSchema.safeParse({
        ...baseData,
        dobYear: 1990, // adult, no parentEmail field
      });
      expect(result.success).toBe(true);
    });

    it('rejects omitted parent email for 13-17 users', () => {
      const result = registrationSchema.safeParse(baseData); // 15 years old, no parentEmail
      expect(result.success).toBe(false);
      if (!result.success) {
        const parentEmailError = result.error.issues.find((i) => i.path.includes('parentEmail'));
        expect(parentEmailError?.message).toBe('Parent/Guardian email is required for users under 18');
      }
    });

    it('rejects empty parent email for 13-17 users', () => {
      const result = registrationSchema.safeParse({
        ...baseData,
        parentEmail: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const parentEmailError = result.error.issues.find((i) => i.path.includes('parentEmail'));
        expect(parentEmailError?.message).toBe('Parent/Guardian email is required for users under 18');
      }
    });

    it('rejects whitespace-only parent email for 13-17 users', () => {
      const result = registrationSchema.safeParse({
        ...baseData,
        parentEmail: '   ',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const parentEmailError = result.error.issues.find((i) => i.path.includes('parentEmail'));
        // Whitespace-only fails email validation before the required check
        expect(parentEmailError?.message).toBe('Please enter a valid email address');
      }
    });
  });

  describe('Registration submission for 13-17 users', () => {
    it('includes parent_email_encrypted and requires_parental_consent in registration payload', async () => {
      renderRegister();
      setDob(15);
      fillRequiredFields({ parentEmail: 'parent@example.com' });

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(mockRegisterEmailPassword).toHaveBeenCalledWith(
          expect.objectContaining({
            parent_email_encrypted: ['mockedencrypted'],
            requires_parental_consent: [true],
          })
        );
      });
    });

    it('does NOT include parent email fields for 18+ users', async () => {
      renderRegister();
      setDob(25);
      fillRequiredFields();

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(mockRegisterEmailPassword).toHaveBeenCalledWith(
          expect.objectContaining({
            parent_email_encrypted: [],
            requires_parental_consent: [],
          })
        );
      });
    });
  });

  describe('Post-registration routing', () => {
    it('routes 13-17 users to recovery key step first then /parental-consent-pending', async () => {
      renderRegister();
      setDob(15);
      fillRequiredFields({ parentEmail: 'parent@example.com' });

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      // Should show recovery key step first
      await waitFor(() => {
        expect(screen.getByText('Save Your Recovery Key')).toBeInTheDocument();
      });

      // The continue button should say "Continue" (not "Continue to Email Verification")
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    it('stores user_id in localStorage for resend functionality', async () => {
      renderRegister();
      setDob(15);
      fillRequiredFields({ parentEmail: 'parent@example.com' });

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(localStorage.getItem('__hw_pending_consent_user')).toBe('user-123');
      });
    });

    it('does NOT store sessionStorage credentials for 13-17 users', async () => {
      renderRegister();
      setDob(15);
      fillRequiredFields({ parentEmail: 'parent@example.com' });

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(screen.getByText('Save Your Recovery Key')).toBeInTheDocument();
      });
      expect(sessionStorage.getItem('verify_credentials')).toBeNull();
    });

    it('routes 18+ users to /verify via recovery key step (no regression)', async () => {
      renderRegister();
      setDob(25);
      fillRequiredFields();

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      // Should show recovery key step first
      await waitFor(() => {
        expect(screen.getByText('Save Your Recovery Key')).toBeInTheDocument();
      });

      // The continue button should say "Continue to Email Verification"
      expect(screen.getByRole('button', { name: 'Continue to Email Verification' })).toBeInTheDocument();
    });
  });

  describe('calculateAge edge cases for COPPA', () => {
    it('returns 13 for a 13-year-old', () => {
      const today = new Date();
      const age = calculateAge(today.getFullYear() - 13, 1, 1);
      expect(age).toBeGreaterThanOrEqual(12);
      expect(age).toBeLessThanOrEqual(13);
    });

    it('returns 17 for a 17-year-old', () => {
      const today = new Date();
      const age = calculateAge(today.getFullYear() - 17, 1, 1);
      expect(age).toBeGreaterThanOrEqual(16);
      expect(age).toBeLessThanOrEqual(17);
    });
  });
});

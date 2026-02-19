import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { passwordSchema } from '@/utils/password-validation';
import { hashEmail, encryptText } from '@/utils/crypto';
import {
  generateMasterRecoveryKey,
  generateSalt,
  deriveKeyFromPassword,
  encryptRecoveryKey,
} from '@/utils/recoveryKeys';
import { hashIpAddress } from '@/utils/password-validation';
import { interestFormSchema } from '@/utils/validation';
import { useUserService } from '@/hooks/useUserService';
import { cn } from '@/utils/cn';
import { validateReturnUrl } from '@hello-world-co-op/auth';
import DateOfBirthInput, {
  getDaysInMonth,
  type DateOfBirthValue,
} from '@/components/DateOfBirthInput/DateOfBirthInput';

// Age gate constants
const AGE_BLOCK_KEY = '__hw_age_block';
const AGE_BLOCK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// BL-012.1: Return URL localStorage key
const RETURN_TO_KEY = '__hw_return_to';

// BL-012.4: Pending consent user ID localStorage key
const PENDING_CONSENT_USER_KEY = '__hw_pending_consent_user';

/**
 * Allowed path prefixes for marketing-suite relative redirects.
 * @see BL-031.2 — migrated from local validateReturnUrl.ts
 */
const MARKETING_ALLOWED_PATHS = [
  '/signup',
  '/verify',
  '/login',
  '/link-identity',
  '/complete-profile',
  '/mission-control',
  '/dashboard',
  '/settings',
  '/profile',
  '/chat',
  '/fleet',
  '/workspace',
  '/backlog',
  '/capture',
  '/admin',
  '/otter-camp',
  '/blog',
];

type AgeGateStatus = 'pending' | 'blocked' | 'minor' | 'adult';

/**
 * Calculate age from DOB components
 */
// eslint-disable-next-line react-refresh/only-export-components
export function calculateAge(year: number, month: number, day: number): number {
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Registration form schema
 * Combines name validation from interest form + password validation
 * FOS-3.3.1: Extended with optional CRM fields for lead tracking
 * BL-011.2: Extended with DOB fields for COPPA compliance
 * @exports registrationSchema - Exported for testing
 */
// eslint-disable-next-line react-refresh/only-export-components
export const registrationSchema = z
  .object({
    // BL-011.2: DOB fields for age verification
    dobMonth: z.number().min(1).max(12),
    dobDay: z.number().min(1).max(31),
    dobYear: z.number().min(1900).max(new Date().getFullYear()),
    firstName: interestFormSchema.shape.first_name,
    lastName: interestFormSchema.shape.last_name,
    email: interestFormSchema.shape.email,
    password: passwordSchema,
    confirmPassword: z.string(),
    // BL-012.4: Parent/guardian email for 13-17 users (COPPA parental consent)
    parentEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
    // FOS-3.3.1: Optional CRM fields for lead tracking
    company: z.string().max(100).optional(),
    jobTitle: z.string().max(100).optional(),
    interestArea: z.enum(['product', 'engineering', 'marketing', 'sales', 'other']).optional(),
    referralSource: z.enum(['google', 'referral', 'social', 'event', 'other']).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      // Validate the DOB is a real date
      const maxDays = getDaysInMonth(data.dobMonth, data.dobYear);
      return data.dobDay <= maxDays;
    },
    {
      message: 'Invalid date of birth',
      path: ['dobDay'],
    }
  )
  .refine(
    (data) => {
      // Validate user is at least 13 years old
      const age = calculateAge(data.dobYear, data.dobMonth, data.dobDay);
      return age >= 13;
    },
    {
      message: 'You must be at least 13 years old to create an account',
      path: ['dobYear'],
    }
  )
  .refine(
    (data) => {
      // BL-012.4: Parent email is required for 13-17 year old users (COPPA compliance)
      const age = calculateAge(data.dobYear, data.dobMonth, data.dobDay);
      const needsConsent = age >= 13 && age < 18;
      if (needsConsent && (!data.parentEmail || data.parentEmail.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Parent/Guardian email is required for users under 18',
      path: ['parentEmail'],
    }
  )
  .refine(
    (data) => {
      // BL-012.4: Parent email must be different from registrant email (prevents self-approval)
      if (!data.parentEmail || data.parentEmail === '') return true;
      return data.parentEmail.toLowerCase() !== data.email.toLowerCase();
    },
    {
      message: 'Parent email must be different from your email',
      path: ['parentEmail'],
    }
  );

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationStatus {
  type: 'idle' | 'loading' | 'success' | 'error' | 'rate_limit';
  message?: string;
}

type RegistrationStep = 'form' | 'recovery-key';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { registerEmailPassword } = useUserService();
  const [status, setStatus] = useState<RegistrationStatus>({ type: 'idle' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<RegistrationStep>('form');
  const [recoveryKeyHex, setRecoveryKeyHex] = useState<string>('');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [savedKeyConfirmed, setSavedKeyConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  // BL-011.2: Age gate state
  const [ageGateStatus, setAgeGateStatus] = useState<AgeGateStatus>('pending');
  const [dobValue, setDobValue] = useState<DateOfBirthValue | null>(null);
  // BL-012.4: Parental consent state for 13-17 users
  const [requiresParentalConsent, setRequiresParentalConsent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
  });

  const password = watch('password', '');

  // BL-011.2: Check localStorage for existing age block on mount
  useEffect(() => {
    const stored = localStorage.getItem(AGE_BLOCK_KEY);
    if (stored) {
      try {
        const { blocked_at } = JSON.parse(stored);
        if (Date.now() - blocked_at < AGE_BLOCK_TTL_MS) {
          setAgeGateStatus('blocked');
        } else {
          localStorage.removeItem(AGE_BLOCK_KEY);
        }
      } catch {
        localStorage.removeItem(AGE_BLOCK_KEY);
      }
    }
  }, []);

  // BL-012.1: Read and validate returnTo from query params, persist in localStorage
  useEffect(() => {
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      const validated = validateReturnUrl(returnTo, { allowedPaths: MARKETING_ALLOWED_PATHS, defaultRedirect: '/' });
      // Only store if validation returned a meaningful URL (not the default '/')
      if (validated !== '/') {
        localStorage.setItem(RETURN_TO_KEY, validated);
      }
    }
  }, [searchParams]);

  /**
   * BL-011.2: Handle DOB change - calculate age and set gate status
   */
  const handleDobChange = useCallback(
    (newValue: DateOfBirthValue | null) => {
      setDobValue(newValue);

      if (!newValue || !newValue.month || !newValue.day || !newValue.year) {
        // Incomplete DOB - stay pending
        if (ageGateStatus !== 'blocked') {
          setAgeGateStatus('pending');
        }
        return;
      }

      // Update form values
      setValue('dobMonth', newValue.month);
      setValue('dobDay', newValue.day);
      setValue('dobYear', newValue.year);

      const age = calculateAge(newValue.year, newValue.month, newValue.day);

      if (age < 13) {
        setAgeGateStatus('blocked');
        localStorage.setItem(AGE_BLOCK_KEY, JSON.stringify({ blocked_at: Date.now() }));
        setRequiresParentalConsent(false);
      } else if (age < 18) {
        setAgeGateStatus('minor');
        // BL-012.4: 13-17 users require parental consent
        setRequiresParentalConsent(true);
      } else {
        setAgeGateStatus('adult');
        setRequiresParentalConsent(false);
      }
    },
    [setValue, ageGateStatus]
  );

  /**
   * Copy recovery key to clipboard
   */
  const copyRecoveryKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recoveryKeyHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [recoveryKeyHex]);

  /**
   * Download recovery key as a text file
   */
  const downloadRecoveryKey = useCallback(() => {
    const content = `Hello World DAO - Recovery Key
================================

IMPORTANT: Store this file securely! You will need this key to reset your password if you forget it.

Your Recovery Key:
${recoveryKeyHex}

Instructions:
1. Save this file in a secure location (password manager, encrypted drive, or printed in a safe)
2. Do NOT share this key with anyone
3. If you lose both your password AND this key, you will lose access to your encrypted data

Generated: ${new Date().toISOString()}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hello-world-dao-recovery-key.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recoveryKeyHex]);

  /**
   * Proceed to next step after confirming recovery key saved
   * BL-012.1: returnTo is already persisted in localStorage; no need to thread via query param
   * BL-012.4: 13-17 users go to parental consent pending page instead of email verification
   */
  const proceedToVerification = useCallback(() => {
    if (requiresParentalConsent) {
      navigate('/parental-consent-pending');
    } else {
      navigate(`/verify?email=${encodeURIComponent(pendingEmail)}`);
    }
  }, [navigate, pendingEmail, requiresParentalConsent]);

  /**
   * Get client IP address for rate limiting
   */
  const getClientIpAddress = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP address:', error);
      return null;
    }
  }, []);

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setStatus({ type: 'loading', message: 'Creating your account...' });

      // 1. Hash email for duplicate detection
      const emailHash = await hashEmail(data.email);

      // 2. Generate master recovery key
      setStatus({ type: 'loading', message: 'Generating encryption keys...' });
      const masterRecoveryKey = generateMasterRecoveryKey();

      // Convert recovery key to hex for encryptText function (expects hex key)
      const masterKeyHex = Array.from(masterRecoveryKey)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // 3. Encrypt PII with master recovery key (AES-256-GCM)
      setStatus({ type: 'loading', message: 'Encrypting your information...' });
      const emailEncrypted = await encryptText(data.email, masterKeyHex);
      const firstNameEncrypted = await encryptText(data.firstName, masterKeyHex);
      const lastNameEncrypted = await encryptText(data.lastName, masterKeyHex);

      // BL-011.2: Encrypt DOB with master recovery key
      const dobString = `${data.dobYear}-${String(data.dobMonth).padStart(2, '0')}-${String(data.dobDay).padStart(2, '0')}`;
      const dobEncrypted = await encryptText(dobString, masterKeyHex);

      // BL-012.4: Encrypt parent email if provided (13-17 users)
      let parentEmailEncrypted: string | undefined;
      if (requiresParentalConsent && data.parentEmail) {
        parentEmailEncrypted = await encryptText(data.parentEmail, masterKeyHex);
      }

      // 4. Generate salt and derive key from password
      setStatus({ type: 'loading', message: 'Securing your recovery key...' });
      const salt = generateSalt();
      const passwordDerivedKey = await deriveKeyFromPassword(data.password, salt);

      // 5. Encrypt recovery key with password-derived key
      const encryptedRecoveryKey = await encryptRecoveryKey(masterRecoveryKey, passwordDerivedKey);

      // Convert salt to base64 for transmission
      const saltBase64 = btoa(String.fromCharCode(...salt));

      // 6. Hash IP address for rate limiting (if available)
      let ipHash: string | undefined;
      const ipAddress = await getClientIpAddress();
      if (ipAddress) {
        ipHash = await hashIpAddress(ipAddress);
      }

      // 7. Call user-service register_email_password
      setStatus({ type: 'loading', message: 'Registering your account...' });

      const result = await registerEmailPassword({
        email_encrypted: emailEncrypted,
        first_name_encrypted: firstNameEncrypted,
        last_name_encrypted: lastNameEncrypted,
        email_hash: emailHash,
        password: data.password,
        encryption_key_id: 'user-derived',
        encrypted_recovery_key: encryptedRecoveryKey,
        password_salt: saltBase64,
        email_plaintext_for_verification: data.email,
        ip_hash: ipHash ? [ipHash] : [],
        dob_encrypted: dobEncrypted,
        dob_plaintext_for_validation: dobString,
        company: data.company ? [data.company] : [],
        job_title: data.jobTitle ? [data.jobTitle] : [],
        interest_area: data.interestArea ? [data.interestArea] : [],
        referral_source: data.referralSource ? [data.referralSource] : [],
        // BL-028.2: Send firstName as display_name for cross-suite session display
        display_name: [data.firstName],
        // BL-012.4: Include parent email and consent flag for 13-17 users
        parent_email_encrypted: parentEmailEncrypted ? [parentEmailEncrypted] : [],
        requires_parental_consent: requiresParentalConsent ? [true] : [],
      });

      if ('Ok' in result) {
        const response = result.Ok;
        if (response.success) {
          // BL-012.4: Check if parental consent is pending (13-17 users)
          const consentPending = requiresParentalConsent ||
            (response as { parental_consent_status?: string }).parental_consent_status === 'Pending';

          if (consentPending) {
            // BL-012.4: Store user_id for resend functionality
            if (response.user_id) {
              const userId = Array.isArray(response.user_id)
                ? response.user_id[0] || ''
                : response.user_id || '';
              if (userId) {
                localStorage.setItem(PENDING_CONSENT_USER_KEY, userId);
              }
            }
          }

          // Store first/last name temporarily for verification
          localStorage.setItem('verify_firstName', data.firstName);
          localStorage.setItem('verify_lastName', data.lastName);
          localStorage.setItem('verify_email', data.email);

          if (!consentPending) {
            // Store credentials in sessionStorage for auto-login after verification
            // sessionStorage is per-tab only and clears when the tab closes
            sessionStorage.setItem('verify_credentials', JSON.stringify({
              email: data.email,
              password: data.password,
            }));
          }

          // Show recovery key step instead of redirecting immediately
          setRecoveryKeyHex(masterKeyHex);
          setPendingEmail(data.email);
          setStep('recovery-key');
          setStatus({ type: 'idle' });
        } else {
          setStatus({ type: 'error', message: response.message });
        }
      } else {
        const error = result.Err;
        if (error.includes('Too many registration attempts')) {
          setStatus({ type: 'rate_limit', message: error });
        } else if (error.includes('exists but is not verified')) {
          localStorage.setItem('verify_firstName', data.firstName);
          localStorage.setItem('verify_lastName', data.lastName);
          localStorage.setItem('verify_email', data.email);
          sessionStorage.setItem('verify_credentials', JSON.stringify({
            email: data.email, password: data.password,
          }));

          setStatus({
            type: 'success',
            message: 'Redirecting to verification page...',
          });
          setTimeout(() => {
            navigate(`/verify?email=${encodeURIComponent(data.email)}`);
          }, 1000);
        } else {
          setStatus({ type: 'error', message: error });
        }
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);

      const errorMessage = error instanceof Error ? error.message : '';

      if (errorMessage.includes('Too many registration attempts')) {
        setStatus({
          type: 'rate_limit',
          message: 'Too many registration attempts. Please try again in 10 minutes.',
        });
      } else if (errorMessage.includes('exists but is not verified')) {
        localStorage.setItem('verify_firstName', data.firstName);
        localStorage.setItem('verify_lastName', data.lastName);
        localStorage.setItem('verify_email', data.email);
        sessionStorage.setItem('verify_credentials', JSON.stringify({
          email: data.email, password: data.password,
        }));

        setStatus({
          type: 'success',
          message: 'Redirecting to verification page...',
        });
        setTimeout(() => {
          navigate(`/verify?email=${encodeURIComponent(data.email)}`);
        }, 1000);
      } else if (errorMessage.includes('already exists')) {
        setStatus({
          type: 'error',
          message: 'An account with this email already exists. Please login instead.',
        });
      } else {
        setStatus({
          type: 'error',
          message: errorMessage || 'Failed to create account. Please try again.',
        });
      }
    }
  };

  // Recovery Key Step - shown after successful registration
  if (step === 'recovery-key') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-xl" aria-hidden="true">
                &#x1F6E1;
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Save Your Recovery Key</h1>
            <p className="mt-2 text-slate-600">
              You'll need this key to reset your password if you forget it
            </p>
          </div>

          <div className="space-y-6">
            {/* Warning */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <strong>Important:</strong> Write down or save this key securely. Without it, you
              cannot recover your account if you forget your password.
            </div>

            {/* Recovery Key Display */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Your Recovery Key</label>
              <div className="p-4 bg-slate-100 rounded-lg font-mono text-sm break-all select-all border border-slate-200">
                {recoveryKeyHex}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                className={cn(
                  'flex-1 px-4 py-2 border border-slate-300 rounded-lg',
                  'text-sm font-medium text-slate-700',
                  'hover:bg-slate-50 transition-colors'
                )}
                onClick={copyRecoveryKey}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 px-4 py-2 border border-slate-300 rounded-lg',
                  'text-sm font-medium text-slate-700',
                  'hover:bg-slate-50 transition-colors'
                )}
                onClick={downloadRecoveryKey}
              >
                Download
              </button>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="confirm-saved"
                checked={savedKeyConfirmed}
                onChange={(e) => setSavedKeyConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="confirm-saved" className="text-sm leading-relaxed cursor-pointer text-slate-700">
                I have saved my recovery key in a secure location. I understand that I cannot
                recover my account without this key if I forget my password.
              </label>
            </div>

            {/* Continue Button */}
            <button
              type="button"
              disabled={!savedKeyConfirmed}
              onClick={proceedToVerification}
              className={cn(
                'w-full px-6 py-3',
                'bg-primary-700 text-white',
                'rounded-lg font-semibold',
                'hover:bg-primary-800',
                'focus-visible:outline-primary-600',
                'transition-colors',
                !savedKeyConfirmed && 'opacity-50 cursor-not-allowed'
              )}
            >
              {requiresParentalConsent ? 'Continue' : 'Continue to Email Verification'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // BL-011.2: Block screen for under-13 users
  if (ageGateStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
            <p className="mt-2 text-slate-600">Join Hello World DAO Cooperative</p>
          </div>
          <div className="space-y-6">
            <div
              className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm"
              role="alert"
              data-testid="age-block-message"
            >
              We're sorry, but you must be at least 13 years old to create an account. This is
              required by the Children's Online Privacy Protection Act (COPPA).
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className={cn(
                'w-full px-6 py-3',
                'border border-slate-300 text-slate-700',
                'rounded-lg font-semibold',
                'hover:bg-slate-50',
                'transition-colors'
              )}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Registration Form Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
          <p className="mt-2 text-slate-600">Join Hello World DAO Cooperative</p>
        </div>

        {/* Status messages */}
        {status.type === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm" role="alert">
            {status.message}
          </div>
        )}

        {status.type === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm" role="alert">
            {status.message}
          </div>
        )}

        {status.type === 'rate_limit' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm" role="alert">
            {status.message}
          </div>
        )}

        {/* Registration form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* BL-011.2: Date of Birth - MUST be first field (COPPA: no PII before age verification) */}
          <DateOfBirthInput
            value={dobValue}
            onChange={handleDobChange}
            disabled={isSubmitting}
            error={errors.dobMonth?.message || errors.dobDay?.message || errors.dobYear?.message}
          />

          {/* BL-011.2: COPPA privacy notice */}
          <div className="text-xs text-slate-500">
            We collect your date of birth to comply with the Children's Online Privacy Protection
            Act (COPPA). Your date of birth is encrypted and stored securely. We do not knowingly
            collect information from children under 13.
          </div>

          {/* BL-011.2 / BL-012.4: Age-appropriate messaging */}
          {ageGateStatus === 'minor' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm" role="status">
              You can create an account! A parent or guardian must approve your account. Full membership (voting, governance) requires age 18+.
            </div>
          )}

          {ageGateStatus === 'adult' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm" role="status">
              You are eligible for full membership including voting and governance participation.
            </div>
          )}

          {/* Only show remaining form fields if age gate is passed (minor or adult) */}
          {(ageGateStatus === 'minor' || ageGateStatus === 'adult') && (
            <>
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                    First Name <span className="text-error">*</span>
                  </label>
                  <input
                    {...register('firstName')}
                    id="firstName"
                    type="text"
                    disabled={isSubmitting}
                    placeholder="John"
                    autoComplete="given-name"
                    className={cn(
                      'w-full px-4 py-2 border rounded-lg',
                      'focus-visible:outline-primary-600',
                      errors.firstName ? 'border-error' : 'border-slate-300'
                    )}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-error" role="alert">
                      {errors.firstName.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">Your first name will be your public display name</p>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name <span className="text-error">*</span>
                  </label>
                  <input
                    {...register('lastName')}
                    id="lastName"
                    type="text"
                    disabled={isSubmitting}
                    placeholder="Doe"
                    autoComplete="family-name"
                    className={cn(
                      'w-full px-4 py-2 border rounded-lg',
                      'focus-visible:outline-primary-600',
                      errors.lastName ? 'border-error' : 'border-slate-300'
                    )}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-error" role="alert">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address <span className="text-error">*</span>
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  disabled={isSubmitting}
                  placeholder="john.doe@example.com"
                  autoComplete="email"
                  className={cn(
                    'w-full px-4 py-2 border rounded-lg',
                    'focus-visible:outline-primary-600',
                    errors.email ? 'border-error' : 'border-slate-300'
                  )}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* BL-012.4: Parent/Guardian Email field for 13-17 users */}
              {requiresParentalConsent && (
                <div>
                  <label htmlFor="parentEmail" className="block text-sm font-medium text-slate-700 mb-2">
                    Parent/Guardian Email <span className="text-error">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    A parent or guardian must approve your account. We'll send them a consent request.
                  </p>
                  <input
                    {...register('parentEmail')}
                    id="parentEmail"
                    type="email"
                    disabled={isSubmitting}
                    placeholder="parent@example.com"
                    autoComplete="off"
                    data-testid="parent-email-input"
                    className={cn(
                      'w-full px-4 py-2 border rounded-lg',
                      'focus-visible:outline-primary-600',
                      errors.parentEmail ? 'border-error' : 'border-slate-300'
                    )}
                  />
                  {errors.parentEmail && (
                    <p className="mt-1 text-sm text-error" role="alert">
                      {errors.parentEmail.message}
                    </p>
                  )}
                </div>
              )}

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    disabled={isSubmitting}
                    placeholder="Enter a strong password"
                    autoComplete="new-password"
                    className={cn(
                      'w-full px-4 py-2 pr-12 border rounded-lg',
                      'focus-visible:outline-primary-600',
                      errors.password ? 'border-error' : 'border-slate-300'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 py-2 text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-error" role="alert">
                    {errors.password.message}
                  </p>
                )}

                {/* Password strength meter */}
                {password && (
                  <div className="mt-3">
                    <PasswordStrengthMeter password={password} showFeedback={true} />
                  </div>
                )}
              </div>

              {/* Confirm password field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    disabled={isSubmitting}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className={cn(
                      'w-full px-4 py-2 pr-12 border rounded-lg',
                      'focus-visible:outline-primary-600',
                      errors.confirmPassword ? 'border-error' : 'border-slate-300'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 top-0 h-full px-3 py-2 text-slate-500 hover:text-slate-700"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Optional Information Section (FOS-3.3.5) */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  className={cn(
                    'w-full flex items-center justify-between',
                    'px-4 py-2 text-sm font-medium text-slate-700',
                    'hover:bg-slate-50 rounded-lg transition-colors'
                  )}
                  disabled={isSubmitting}
                >
                  <span>Tell us more (optional)</span>
                  <span
                    className={cn(
                      'transition-transform text-slate-400',
                      showOptionalFields && 'rotate-180'
                    )}
                    aria-hidden="true"
                  >
                    &#x25BC;
                  </span>
                </button>

                {showOptionalFields && (
                  <div className="space-y-4 mt-4">
                    {/* Company field */}
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-2">
                        Company
                      </label>
                      <input
                        {...register('company')}
                        id="company"
                        type="text"
                        disabled={isSubmitting}
                        placeholder="Acme Inc."
                        maxLength={100}
                        className={cn(
                          'w-full px-4 py-2 border rounded-lg',
                          'focus-visible:outline-primary-600',
                          'border-slate-300'
                        )}
                      />
                    </div>

                    {/* Job Title field */}
                    <div>
                      <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700 mb-2">
                        Job Title
                      </label>
                      <input
                        {...register('jobTitle')}
                        id="jobTitle"
                        type="text"
                        disabled={isSubmitting}
                        placeholder="Product Manager"
                        maxLength={100}
                        className={cn(
                          'w-full px-4 py-2 border rounded-lg',
                          'focus-visible:outline-primary-600',
                          'border-slate-300'
                        )}
                      />
                    </div>

                    {/* Interest Area dropdown */}
                    <div>
                      <label htmlFor="interestArea" className="block text-sm font-medium text-slate-700 mb-2">
                        What interests you most?
                      </label>
                      <select
                        {...register('interestArea')}
                        id="interestArea"
                        className={cn(
                          'w-full px-4 py-2 border rounded-lg',
                          'focus-visible:outline-primary-600',
                          'border-slate-300'
                        )}
                        disabled={isSubmitting}
                      >
                        <option value="">Select...</option>
                        <option value="product">Product</option>
                        <option value="engineering">Engineering</option>
                        <option value="marketing">Marketing</option>
                        <option value="sales">Sales</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Referral Source dropdown */}
                    <div>
                      <label htmlFor="referralSource" className="block text-sm font-medium text-slate-700 mb-2">
                        How did you hear about us?
                      </label>
                      <select
                        {...register('referralSource')}
                        id="referralSource"
                        className={cn(
                          'w-full px-4 py-2 border rounded-lg',
                          'focus-visible:outline-primary-600',
                          'border-slate-300'
                        )}
                        disabled={isSubmitting}
                      >
                        <option value="">Select...</option>
                        <option value="google">Google Search</option>
                        <option value="referral">Friend/Colleague</option>
                        <option value="social">Social Media</option>
                        <option value="event">Event/Conference</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || status.type === 'loading'}
                className={cn(
                  'w-full px-6 py-3',
                  'bg-primary-700 text-white',
                  'rounded-lg font-semibold',
                  'hover:bg-primary-800',
                  'focus-visible:outline-primary-600',
                  'transition-colors',
                  (isSubmitting || status.type === 'loading') && 'opacity-50 cursor-not-allowed'
                )}
              >
                {status.type === 'loading' ? status.message : 'Create Account'}
              </button>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              // Login page is on foundery-os until universal login is built in marketing-suite
              const founderyUrl = import.meta.env.VITE_FOUNDERY_OS_URL || 'https://staging-foundery.helloworlddao.com';
              window.location.href = `${founderyUrl}/login`;
            }}
            className="font-medium text-primary-700 hover:text-primary-800 hover:underline"
          >
            Sign in
          </button>
        </div>

        {/* Privacy notice */}
        <div className="mt-6 text-xs text-slate-500 text-center">
          Your personal information is encrypted client-side before being sent to our servers. We
          use industry-standard security practices to protect your data.
        </div>
      </div>
    </div>
  );
}

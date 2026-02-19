import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateOfBirthInput, {
  type DateOfBirthValue,
} from '@/components/DateOfBirthInput/DateOfBirthInput';
import { calculateAge } from '@/pages/Register';
import { cn } from '@/utils/cn';

// ============================================================================
// Schema
// ============================================================================

const completeProfileSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    display_name: z.string().min(1, 'Display name is required').max(256, 'Display name must be 256 characters or fewer'),
    dobMonth: z.number().min(1, 'Date of birth is required').max(12),
    dobDay: z.number().min(1, 'Date of birth is required').max(31),
    dobYear: z.number().min(1900, 'Date of birth is required').max(new Date().getFullYear()),
    parent_email: z.string().email('Please enter a valid parent/guardian email').optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.parent_email || data.parent_email === '') return true;
      return data.parent_email.toLowerCase() !== data.email.toLowerCase();
    },
    {
      message: 'Parent/guardian email cannot be the same as your email',
      path: ['parent_email'],
    }
  );

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

// ============================================================================
// Types
// ============================================================================

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';
type AgeStatus = 'pending' | 'blocked' | 'minor' | 'adult';

/** Read a cookie value by name from document.cookie */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Complete Your Profile page for II-first users.
 *
 * Shown after Internet Identity login when the user has no email/name/DOB on file.
 * The session cookie must already be set (user is authenticated via II).
 *
 * Story: BL-005.3
 */
export default function CompleteProfile() {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [ageStatus, setAgeStatus] = useState<AgeStatus>('pending');
  const [dobValue, setDobValue] = useState<DateOfBirthValue | null>(null);

  const oracleUrl = import.meta.env.VITE_ORACLE_BRIDGE_URL;
  const daoSuiteUrl = import.meta.env.VITE_DAO_SUITE_URL || 'https://portal.helloworlddao.com';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onBlur',
  });

  // Check if user is authenticated and whether profile is already complete
  useEffect(() => {
    const checkSession = async () => {
      if (!oracleUrl) return;
      try {
        const res = await fetch(`${oracleUrl}/api/auth/session`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!data.authenticated) {
          // Not logged in — redirect to login
          window.location.href = import.meta.env.VITE_FOUNDERY_OS_URL || 'https://foundery.helloworlddao.com';
          return;
        }
        if (data.profile_complete) {
          // Profile already complete — redirect to dashboard
          window.location.href = daoSuiteUrl;
        }
      } catch {
        // Session check failed — show the form anyway
      }
    };
    checkSession();
  }, [oracleUrl, daoSuiteUrl]);

  /**
   * Handle DOB change — calculate age and set gate status.
   * Uses the same pattern as Register.tsx (BL-011.2).
   */
  const handleDobChange = useCallback(
    (newValue: DateOfBirthValue | null) => {
      setDobValue(newValue);

      if (!newValue || !newValue.month || !newValue.day || !newValue.year) {
        if (ageStatus !== 'blocked') {
          setAgeStatus('pending');
        }
        return;
      }

      // Sync with react-hook-form
      setValue('dobMonth', newValue.month);
      setValue('dobDay', newValue.day);
      setValue('dobYear', newValue.year);

      const age = calculateAge(newValue.year, newValue.month, newValue.day);

      if (age < 13) {
        setAgeStatus('blocked');
      } else if (age < 18) {
        setAgeStatus('minor');
      } else {
        setAgeStatus('adult');
      }
    },
    [ageStatus, setValue]
  );

  // Form submission
  const onSubmit = async (data: CompleteProfileFormData) => {
    if (ageStatus === 'blocked') return;

    setSubmitStatus('submitting');
    setSubmitError('');

    // Build YYYY-MM-DD date string
    const dateOfBirth = `${data.dobYear}-${String(data.dobMonth).padStart(2, '0')}-${String(data.dobDay).padStart(2, '0')}`;

    try {
      const csrfToken = getCookie('csrf_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;

      const body: Record<string, string> = {
        email: data.email.trim(),
        display_name: data.display_name.trim(),
        date_of_birth: dateOfBirth,
      };

      if (ageStatus === 'minor' && data.parent_email && data.parent_email.trim() !== '') {
        body.parent_email = data.parent_email.trim();
      }

      const response = await fetch(`${oracleUrl}/api/auth/complete-profile`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitStatus('error');
        setSubmitError(result.message || 'Failed to complete profile');
        return;
      }

      setSubmitStatus('success');

      // Redirect based on response
      if (result.consent_pending) {
        // Minor — redirect to parental consent pending page
        setTimeout(() => {
          window.location.href = `${window.location.origin}/parental-consent-pending`;
        }, 1500);
      } else if (result.redirect) {
        setTimeout(() => {
          window.location.href = result.redirect;
        }, 1500);
      } else {
        setTimeout(() => {
          window.location.href = daoSuiteUrl;
        }, 1500);
      }
    } catch (err) {
      setSubmitStatus('error');
      setSubmitError('Network error. Please try again.');
      console.error('[CompleteProfile] Submit error:', err);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4"
            aria-hidden="true"
          >
            <svg className="w-8 h-8 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Profile</h1>
          <p className="mt-2 text-slate-600">
            A few more details to finish setting up your account
          </p>
        </div>

        {/* Success State */}
        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center" role="status">
            <p className="text-green-800 font-medium">Profile completed successfully!</p>
            <p className="text-green-600 text-sm mt-1">Redirecting...</p>
          </div>
        )}

        {/* Error State */}
        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

        {/* Age Blocked State */}
        {ageStatus === 'blocked' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg" role="alert">
            <p className="text-yellow-800 text-sm font-medium">
              You must be at least 13 years old to create an account.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" aria-label="Complete your profile form">
          {/* Date of Birth (first - COPPA: no PII before age verification) */}
          <DateOfBirthInput
            value={dobValue}
            onChange={handleDobChange}
            disabled={submitStatus === 'submitting' || submitStatus === 'success'}
            error={errors.dobMonth?.message || errors.dobDay?.message || errors.dobYear?.message}
          />

          {/* COPPA privacy notice */}
          <div className="text-xs text-slate-500">
            We collect your date of birth to comply with the Children's Online Privacy Protection
            Act (COPPA). Your date of birth is encrypted and stored securely.
          </div>

          {/* Age-appropriate messaging */}
          {ageStatus === 'minor' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm" role="status">
              You can complete your profile! A parent or guardian must approve your account.
              Full membership (voting, governance) requires age 18+.
            </div>
          )}

          {ageStatus === 'adult' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm" role="status">
              You're eligible for full DAO membership including governance and voting.
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={cn(
                'w-full px-4 py-2.5 border rounded-lg text-slate-900 placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.email ? 'border-red-500' : 'border-slate-300'
              )}
              placeholder="you@example.com"
              disabled={submitStatus === 'submitting' || submitStatus === 'success' || ageStatus === 'blocked'}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-slate-700 mb-1">
              Display Name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="display_name"
              type="text"
              autoComplete="nickname"
              aria-required="true"
              aria-invalid={!!errors.display_name}
              aria-describedby={errors.display_name ? 'display-name-error' : undefined}
              className={cn(
                'w-full px-4 py-2.5 border rounded-lg text-slate-900 placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.display_name ? 'border-red-500' : 'border-slate-300'
              )}
              placeholder="How you want to be known"
              disabled={submitStatus === 'submitting' || submitStatus === 'success' || ageStatus === 'blocked'}
              {...register('display_name')}
            />
            {errors.display_name && (
              <p id="display-name-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.display_name.message}
              </p>
            )}
          </div>

          {/* Parent Email (shown for 13-17) */}
          {ageStatus === 'minor' && (
            <div>
              <label htmlFor="parent_email" className="block text-sm font-medium text-slate-700 mb-1">
                Parent/Guardian Email <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Required for users ages 13-17. Your parent or guardian will receive a consent email.
              </p>
              <input
                id="parent_email"
                type="email"
                autoComplete="off"
                aria-required={ageStatus === 'minor'}
                aria-invalid={!!errors.parent_email}
                aria-describedby={errors.parent_email ? 'parent-email-error' : undefined}
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg text-slate-900 placeholder-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  errors.parent_email ? 'border-red-500' : 'border-slate-300'
                )}
                placeholder="parent@example.com"
                disabled={submitStatus === 'submitting' || submitStatus === 'success'}
                {...register('parent_email')}
              />
              {errors.parent_email && (
                <p id="parent-email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.parent_email.message}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitStatus === 'submitting' || submitStatus === 'success' || ageStatus === 'blocked'}
            className="w-full py-3 px-4 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Complete profile"
          >
            {submitStatus === 'submitting' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Complete Profile'
            )}
          </button>
        </form>

        {/* Info note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Your information is stored securely and used only for your DAO membership.
        </p>
      </div>
    </div>
  );
}

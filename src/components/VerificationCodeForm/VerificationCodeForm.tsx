import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

interface VerificationCodeFormProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Verification Code Form Component
 * Allows user to enter 6-digit code received via email
 * Adapted from monolith: replaced @/components/ui/* with native HTML + Tailwind
 */
export default function VerificationCodeForm({
  email,
  onVerify,
  onResend,
  onCancel,
}: VerificationCodeFormProps) {
  const { t } = useTranslation('form');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      setError(t('verification.code_format_error', 'Verification code must be 6 digits'));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onVerify(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification.verify_failed', 'Failed to verify code'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      await onResend();
      setCode(''); // Clear the code field
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification.resend_failed', 'Failed to resend code'));
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits and max 6 characters
    if (/^\d{0,6}$/.test(value)) {
      setCode(value);
      setError(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200">
      <div className="p-6 pb-4">
        <h3 className="text-2xl font-bold text-slate-900">
          {t('verification.heading', 'Verify Your Email')}
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          {t('verification.description', "We've sent a 6-digit verification code to")}{' '}
          <strong>{email}</strong>.{' '}
          {t('verification.description_suffix', 'Please enter it below to complete your registration.')}
        </p>
      </div>
      <div className="p-6 pt-2">
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-2 mb-6">
            <label htmlFor="verification-code" className="block text-sm font-medium text-slate-700">
              {t('verification.code_label', 'Verification Code')}{' '}
              <span className="text-error" aria-label={t('common:aria_labels.required', 'required')}>
                *
              </span>
            </label>
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleCodeChange}
              placeholder="123456"
              maxLength={6}
              autoComplete="one-time-code"
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'code-error' : 'code-help'}
              className={cn(
                'w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest font-mono',
                'focus-visible:outline-primary-600',
                'touch-target',
                error ? 'border-error focus-visible:outline-error' : 'border-slate-300'
              )}
            />
            {error ? (
              <p id="code-error" role="alert" className="text-sm text-error">
                {error}
              </p>
            ) : (
              <p id="code-help" className="text-sm text-slate-500">
                {t('verification.code_help', 'Enter the 6-digit code from your email')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isResending || code.length !== 6}
              className={cn(
                'w-full px-6 py-3',
                'bg-primary-700 text-white',
                'rounded-lg font-semibold',
                'hover:bg-primary-800',
                'focus-visible:outline-primary-600',
                'transition-colors',
                'touch-target',
                (isSubmitting || isResending || code.length !== 6) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('verification.verifying', 'Verifying...')}
                </span>
              ) : (
                t('verification.verify_button', 'Verify Email')
              )}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting || isResending}
                className={cn(
                  'flex-1 px-4 py-2',
                  'bg-slate-100 text-slate-700',
                  'rounded-lg font-medium',
                  'hover:bg-slate-200',
                  'focus-visible:outline-primary-600',
                  'transition-colors',
                  'touch-target',
                  (isSubmitting || isResending) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isResending ? t('verification.resending', 'Resending...') : t('verification.resend_button', 'Resend Code')}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting || isResending}
                className={cn(
                  'flex-1 px-4 py-2',
                  'bg-slate-100 text-slate-700',
                  'rounded-lg font-medium',
                  'hover:bg-slate-200',
                  'focus-visible:outline-primary-600',
                  'transition-colors',
                  'touch-target',
                  (isSubmitting || isResending) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {t('common:buttons.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </form>

        <p className="mt-4 text-xs text-slate-500 text-center">
          {t('verification.spam_notice', 'Didn\'t receive the email? Check your spam folder or click "Resend Code"')}
        </p>
      </div>
    </div>
  );
}

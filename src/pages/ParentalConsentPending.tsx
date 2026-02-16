import { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { showSuccess, showError } from '@/utils/toast';

/**
 * BL-012.4: localStorage key for pending consent user ID
 * Must match the key used in Register.tsx
 */
const PENDING_CONSENT_USER_KEY = '__hw_pending_consent_user';

/**
 * Maximum number of consent email resends allowed per session
 */
const MAX_RESENDS = 3;

/**
 * Get the oracle-bridge base URL from environment
 */
function getOracleBridgeUrl(): string {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ORACLE_BRIDGE_URL) ||
    'http://localhost:8787'
  );
}

/**
 * BL-012.4: Parental Consent Pending page
 *
 * Shown to 13-17 year old users after registration.
 * Explains that a consent request was sent to their parent/guardian
 * and provides a resend button (rate-limited to 3 attempts).
 */
export default function ParentalConsentPending() {
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const firstName = localStorage.getItem('verify_firstName') || '';
  const founderyUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FOUNDERY_OS_URL) ||
    'https://staging-foundery.helloworlddao.com';

  /**
   * Handle resending the consent email
   * Rate-limited to MAX_RESENDS per session
   */
  const handleResend = useCallback(async () => {
    if (resendCount >= MAX_RESENDS) {
      showError('Maximum resend attempts reached. Please contact support.');
      return;
    }

    const userId = localStorage.getItem(PENDING_CONSENT_USER_KEY);
    if (!userId) {
      showError('Unable to resend. Please try registering again.');
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch(`${getOracleBridgeUrl()}/api/auth/resend-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        setResendCount((prev) => prev + 1);
        showSuccess('Consent email resent successfully');
      } else {
        const data = await response.json().catch(() => ({}));
        showError(data.error || data.message || 'Failed to resend consent email. Please try again.');
      }
    } catch {
      showError('Failed to resend consent email. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [resendCount]);

  const resendDisabled = resendCount >= MAX_RESENDS || isResending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 text-xl" aria-hidden="true">
              &#x2709;
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="consent-pending-heading">
            Waiting for Parental Consent
          </h1>
          {firstName && (
            <p className="mt-2 text-slate-600">
              Hi {firstName}! Your account is almost ready.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {/* Explanation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm" role="status" data-testid="consent-explanation">
            <p className="mb-2">
              We sent a consent request to your parent/guardian. They have <strong>7 days</strong> to approve your account.
            </p>
            <p>
              Ask your parent or guardian to check their email for a message from Hello World DAO and click the approval link.
            </p>
          </div>

          {/* Resend Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendDisabled}
              data-testid="resend-consent-button"
              className={cn(
                'px-6 py-2',
                'border border-primary-300 text-primary-700',
                'rounded-lg font-medium text-sm',
                'hover:bg-primary-50',
                'focus-visible:outline-primary-600',
                'transition-colors',
                resendDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isResending ? 'Resending...' : 'Resend Consent Email'}
            </button>
            {resendCount > 0 && resendCount < MAX_RESENDS && (
              <p className="mt-2 text-xs text-slate-500">
                {MAX_RESENDS - resendCount} resend{MAX_RESENDS - resendCount !== 1 ? 's' : ''} remaining
              </p>
            )}
            {resendCount >= MAX_RESENDS && (
              <p className="mt-2 text-xs text-amber-600" data-testid="max-resends-message">
                Maximum resend attempts reached. Please contact support.
              </p>
            )}
          </div>

          {/* Back to Login Link */}
          <div className="text-center pt-2 border-t border-slate-200">
            <a
              href={`${founderyUrl}/login`}
              className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline"
              data-testid="back-to-login-link"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { CONSENT_EXPIRY_DAYS } from '@/utils/constants';

/**
 * Consent token validation response from oracle-bridge
 */
interface ConsentInfo {
  first_name: string;
  age_range: string;
  registration_date: string;
}

type ConsentState =
  | { type: 'loading' }
  | { type: 'valid'; info: ConsentInfo }
  | { type: 'approved' }
  | { type: 'denied' }
  | { type: 'expired' }
  | { type: 'error'; message: string }
  | { type: 'processing' };

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
 * BL-012.4: Consent Landing page
 *
 * Parent/guardian clicks the consent link in their email,
 * which brings them to this page with a token query parameter.
 * They can view the registrant's summary info (no PII) and
 * choose to approve or deny the account.
 */
export default function ConsentLanding() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<ConsentState>({ type: 'loading' });

  const founderyUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FOUNDERY_OS_URL) ||
    'https://staging-foundery.helloworlddao.com';

  /**
   * Validate the consent token on mount
   */
  useEffect(() => {
    if (!token) {
      setState({ type: 'error', message: 'No consent token provided. Please check the link in your email.' });
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`${getOracleBridgeUrl()}/api/auth/consent/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          setState({
            type: 'valid',
            info: {
              first_name: data.first_name || 'A user',
              age_range: data.age_range || '13-17',
              registration_date: data.registration_date || new Date().toLocaleDateString(),
            },
          });
        } else {
          const data = await response.json().catch(() => ({}));
          // 410 Gone = consent token has expired
          if (response.status === 410 || (data.error && data.error.toLowerCase().includes('expired'))) {
            setState({ type: 'expired' });
          } else {
            setState({
              type: 'error',
              message: data.error || data.message || 'Unable to validate consent token.',
            });
          }
        }
      } catch {
        setState({ type: 'error', message: 'Unable to connect to the server. Please try again later.' });
      }
    };

    validateToken();
  }, [token]);

  /**
   * Handle approval
   */
  const handleApprove = useCallback(async () => {
    setState({ type: 'processing' });
    try {
      const response = await fetch(
        `${getOracleBridgeUrl()}/api/auth/consent/${token}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        setState({ type: 'approved' });
      } else {
        const data = await response.json().catch(() => ({}));
        const errorMsg = (data.error || data.message || '').toLowerCase();

        // 410 Gone = consent token has expired
        if (response.status === 410 || errorMsg.includes('expired')) {
          setState({ type: 'expired' });
        } else if (errorMsg.includes('already approved') || errorMsg.includes('already been approved')) {
          // Handle already approved case - treat it as success
          setState({ type: 'approved' });
        } else {
          setState({
            type: 'error',
            message: data.error || data.message || 'Failed to approve. Please try again.',
          });
        }
      }
    } catch {
      setState({ type: 'error', message: 'Unable to connect to the server. Please try again.' });
    }
  }, [token]);

  /**
   * Handle denial
   */
  const handleDeny = useCallback(async () => {
    setState({ type: 'processing' });
    try {
      const response = await fetch(
        `${getOracleBridgeUrl()}/api/auth/consent/${token}/deny`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        setState({ type: 'denied' });
      } else {
        const data = await response.json().catch(() => ({}));
        setState({
          type: 'error',
          message: data.error || data.message || 'Failed to process your response. Please try again.',
        });
      }
    } catch {
      setState({ type: 'error', message: 'Unable to connect to the server. Please try again.' });
    }
  }, [token]);

  // Loading state
  if (state.type === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="mt-4 text-slate-600" data-testid="consent-loading">Validating consent request...</p>
        </div>
      </div>
    );
  }

  // Processing state
  if (state.type === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <p className="text-slate-600" data-testid="consent-processing">Processing your response...</p>
        </div>
      </div>
    );
  }

  // Approved state
  if (state.type === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-2xl" aria-hidden="true">&#x2713;</span>
              <span className="sr-only">Success</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="consent-approved-heading">
              Account Activated
            </h1>
            <p className="mt-2 text-slate-600">
              The account has been approved and is now active. The user can now log in.
            </p>
          </div>
          <div className="text-center">
            <a
              href={`${founderyUrl}/login`}
              className={cn(
                'inline-block px-6 py-3',
                'bg-primary-700 text-white',
                'rounded-lg font-semibold',
                'hover:bg-primary-800',
                'transition-colors'
              )}
              data-testid="consent-login-link"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Denied state
  if (state.type === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900" data-testid="consent-denied-heading">
              Consent Not Granted
            </h1>
            <p className="mt-2 text-slate-600">
              Your response has been recorded. The account will remain inactive.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              If you change your mind or believe this was a mistake, please contact us for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Expired token state
  if (state.type === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-600 text-xl" aria-hidden="true">&#x26A0;</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="consent-expired-heading">
              Consent Link Expired
            </h1>
            <p className="mt-2 text-slate-600">
              This consent link has expired. Consent links are valid for {CONSENT_EXPIRY_DAYS} days.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              The user can request a new consent email from the registration page, or contact support for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.type === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Something Went Wrong</h1>
            <p className="mt-2 text-slate-600" data-testid="consent-error-message">{state.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Valid token - show registrant info and approve/deny buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900" data-testid="consent-review-heading">
            Parental Consent Request
          </h1>
          <p className="mt-2 text-slate-600">
            A user has requested to create an account on Hello World DAO and needs your approval.
          </p>
        </div>

        <div className="space-y-6">
          {/* Registrant Info Summary — no PII */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="registrant-info">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Account Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">{state.info.first_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Age Range</dt>
                <dd className="font-medium text-slate-900">{state.info.age_range}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Registered</dt>
                <dd className="font-medium text-slate-900">{state.info.registration_date}</dd>
              </div>
            </dl>
          </div>

          {/* Explanation */}
          <div className="text-sm text-slate-600">
            <p>
              By approving, you confirm that you are the parent or legal guardian of this user
              and consent to their use of the Hello World DAO platform in accordance with our{' '}
              <a href="/privacy-policy" className="text-primary-700 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleApprove}
              data-testid="consent-approve-button"
              className={cn(
                'flex-1 px-6 py-3',
                'bg-green-600 text-white',
                'rounded-lg font-semibold',
                'hover:bg-green-700',
                'focus-visible:outline-green-600',
                'transition-colors'
              )}
            >
              Approve Account
            </button>
            <button
              type="button"
              onClick={handleDeny}
              data-testid="consent-deny-button"
              className={cn(
                'flex-1 px-6 py-3',
                'border border-slate-300 text-slate-700',
                'rounded-lg font-semibold',
                'hover:bg-slate-50',
                'focus-visible:outline-slate-600',
                'transition-colors'
              )}
            >
              Deny Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

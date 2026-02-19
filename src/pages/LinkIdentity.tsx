import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthClient } from '@dfinity/auth-client';
import { validateReturnUrl } from '@hello-world-co-op/auth';

const II_IDENTITY_PROVIDER = 'https://identity.ic0.app';

type LinkStatus = 'idle' | 'linking' | 'success' | 'error';

/** Read a cookie value by name from document.cookie */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Internet Identity linking page — mandatory step for all email/password users.
 * Users must link their II to get an IC principal for on-chain interactions
 * before accessing any protected DAO suite page.
 *
 * Story: BL-027.1, BL-005.4 (mandatory enforcement)
 */
export default function LinkIdentity() {
  const [status, setStatus] = useState<LinkStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();

  const oracleUrl = import.meta.env.VITE_ORACLE_BRIDGE_URL;
  const daoSuiteUrl = import.meta.env.VITE_DAO_SUITE_URL || 'https://portal.helloworlddao.com';
  const returnUrl = searchParams.get('returnUrl');

  /**
   * Compute safe redirect destination using returnUrl from query params.
   * Falls back to daoSuiteUrl if no returnUrl or if it fails validation.
   */
  const getSuccessRedirect = () => {
    if (!returnUrl) return `${daoSuiteUrl}/dashboard?ii_linked=true`;
    const validated = validateReturnUrl(returnUrl, { defaultRedirect: `${daoSuiteUrl}/dashboard?ii_linked=true` });
    return validated;
  };

  // Check if user already has II linked (from session)
  useEffect(() => {
    const checkExistingLink = async () => {
      if (!oracleUrl) return;
      try {
        const res = await fetch(`${oracleUrl}/api/auth/session`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.authenticated && data.ic_principal) {
          // Already linked — redirect to returnUrl or dashboard
          window.location.href = getSuccessRedirect();
        }
      } catch {
        // Session check failed — show the page anyway
      }
    };
    checkExistingLink();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oracleUrl, daoSuiteUrl]);

  const handleLinkII = async () => {
    setStatus('linking');
    setErrorMessage('');

    try {
      const authClient = await AuthClient.create();

      await authClient.login({
        identityProvider: II_IDENTITY_PROVIDER,
        onSuccess: async () => {
          try {
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal().toText();
            const timestamp = Date.now();
            const challenge = `ch-${timestamp}`;
            const delegationData = `${challenge}:${principal}:delegationData`;

            const csrfToken = getCookie('csrf_token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (csrfToken) headers['x-csrf-token'] = csrfToken;

            const response = await fetch(`${oracleUrl}/api/identity/link-ii`, {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({ delegation: delegationData }),
            });

            const result = await response.json();

            if (result.success) {
              setStatus('success');
              // Brief delay so user sees success state
              setTimeout(() => {
                window.location.href = getSuccessRedirect();
              }, 1500);
            } else if (result.message?.includes('already linked')) {
              // Edge case: already linked by another path
              setStatus('success');
              setTimeout(() => {
                window.location.href = getSuccessRedirect();
              }, 1000);
            } else {
              setStatus('error');
              setErrorMessage(result.message || 'Failed to link Internet Identity. Please try again.');
            }
          } catch (err) {
            setStatus('error');
            setErrorMessage('Network error while linking. Please try again.');
            console.error('[LinkIdentity] API call failed:', err);
          }
        },
        onError: (err) => {
          setStatus('error');
          setErrorMessage(
            typeof err === 'string' && err.includes('popup')
              ? 'The Internet Identity popup was blocked. Please allow popups for this site and try again.'
              : 'Internet Identity authentication was cancelled or failed. Please try again.'
          );
        },
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage('Could not initialize authentication. Please try again.');
      console.error('[LinkIdentity] AuthClient error:', err);
    }
  };

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Link Your Internet Identity
          </h1>
          <p className="mt-2 text-slate-600">
            One more step to unlock the full power of your DAO membership
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8" role="list" aria-label="Benefits of linking Internet Identity">
          {[
            { title: 'Token Balance', desc: 'View your real DOM token balance on-chain' },
            { title: 'Governance Voting', desc: 'Participate in DAO proposals and decisions' },
            { title: 'NFT Ownership', desc: 'Receive your membership SBT and achievement badges' },
            { title: 'Self-Custody', desc: 'Verify ownership of your wallet for full voting rights' },
          ].map((benefit) => (
            <div key={benefit.title} className="flex items-start gap-3" role="listitem">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900">{benefit.title}</p>
                <p className="text-sm text-slate-500">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center" role="status">
            <p className="text-green-800 font-medium">Internet Identity linked successfully!</p>
            <p className="text-green-600 text-sm mt-1">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-red-800 text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleLinkII}
            disabled={status === 'linking' || status === 'success'}
            className="w-full py-3 px-4 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Link Internet Identity to Continue"
          >
            {status === 'linking' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </span>
            ) : (
              'Link Internet Identity to Continue'
            )}
          </button>
        </div>

        {/* Help links */}
        <div className="mt-6 text-center space-y-2">
          <a
            href="https://internetcomputer.org/docs/building-apps/authentication/internet-identity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Having trouble?
          </a>
        </div>
      </div>
    </div>
  );
}

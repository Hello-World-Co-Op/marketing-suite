import { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';

const II_IDENTITY_PROVIDER = 'https://identity.ic0.app';

type LinkStatus = 'idle' | 'linking' | 'success' | 'error';

/**
 * Internet Identity linking page shown after email verification.
 * Users can link their II to get an IC principal for on-chain interactions,
 * or skip and link later from Settings.
 *
 * Story: BL-027.1
 */
export default function LinkIdentity() {
  const [status, setStatus] = useState<LinkStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const oracleUrl = import.meta.env.VITE_ORACLE_BRIDGE_URL;
  const daoSuiteUrl = import.meta.env.VITE_DAO_SUITE_URL || 'https://portal.helloworlddao.com';

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
          // Already linked — skip straight to dashboard
          window.location.href = daoSuiteUrl;
        }
      } catch {
        // Session check failed — show the page anyway
      }
    };
    checkExistingLink();
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

            const response = await fetch(`${oracleUrl}/api/identity/link-ii`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ delegation: delegationData }),
            });

            const result = await response.json();

            if (result.success) {
              setStatus('success');
              // Brief delay so user sees success state
              setTimeout(() => {
                window.location.href = `${daoSuiteUrl}/dashboard?ii_linked=true`;
              }, 1500);
            } else if (result.message?.includes('already linked')) {
              // Edge case: already linked by another path
              setStatus('success');
              setTimeout(() => {
                window.location.href = `${daoSuiteUrl}/dashboard`;
              }, 1000);
            } else {
              setStatus('error');
              setErrorMessage(result.message || 'Failed to link Internet Identity. You can try again or skip for now.');
            }
          } catch (err) {
            setStatus('error');
            setErrorMessage('Network error while linking. You can try again or skip for now.');
            console.error('[LinkIdentity] API call failed:', err);
          }
        },
        onError: (err) => {
          setStatus('error');
          setErrorMessage(
            typeof err === 'string' && err.includes('popup')
              ? 'The Internet Identity popup was blocked. Please allow popups for this site and try again.'
              : 'Internet Identity authentication was cancelled or failed. You can try again or skip for now.'
          );
        },
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage('Could not initialize authentication. Please try again.');
      console.error('[LinkIdentity] AuthClient error:', err);
    }
  };

  const handleSkip = () => {
    window.location.href = daoSuiteUrl;
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
            aria-label="Link Internet Identity"
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
              'Link Internet Identity'
            )}
          </button>

          <button
            onClick={handleSkip}
            disabled={status === 'linking' || status === 'success'}
            className="w-full py-3 px-4 text-slate-600 hover:text-slate-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Skip linking and go to dashboard"
          >
            Skip for now
          </button>
        </div>

        {/* Info note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          You can always link your Internet Identity later from Settings.
        </p>
      </div>
    </div>
  );
}

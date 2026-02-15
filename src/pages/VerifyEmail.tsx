import { useSearchParams, useNavigate } from 'react-router-dom';
import { VerificationCodeForm } from '@/components/VerificationCodeForm';
import { useUserService } from '@/hooks/useUserService';

/**
 * Auto-login via oracle-bridge after email verification.
 * Uses credentials stored in sessionStorage during registration.
 * Returns true if auto-login succeeded (session cookie set), false otherwise.
 */
async function autoLogin(): Promise<boolean> {
  const oracleUrl = import.meta.env.VITE_ORACLE_BRIDGE_URL;

  if (!oracleUrl) {
    return false;
  }

  const raw = sessionStorage.getItem('verify_credentials');
  if (!raw) {
    return false;
  }

  try {
    const { email, password } = JSON.parse(raw);
    sessionStorage.removeItem('verify_credentials');

    const response = await fetch(`${oracleUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        device_fingerprint: crypto.randomUUID(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        user_agent: navigator.userAgent,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.warn('[VerifyEmail] Auto-login failed:', err);
  }

  return false;
}

/**
 * Email verification page.
 * Reached after registration via /verify?email=user@example.com
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyCode, resendVerificationCode } = useUserService();

  const email = searchParams.get('email') || '';

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full mx-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Missing Email</h2>
          <p className="text-slate-600 mb-4">No email address provided for verification.</p>
          <button
            onClick={() => navigate('/signup')}
            className="px-6 py-2 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors"
          >
            Go to Sign Up
          </button>
        </div>
      </div>
    );
  }

  const handleVerify = async (code: string) => {
    const result = await verifyCode(email, code);
    if (result.success) {
      const loggedIn = await autoLogin();
      if (loggedIn) {
        // Session cookie set — go to II linking page
        navigate('/link-identity');
      } else {
        // Auto-login failed — send to foundery login with verified flag
        const founderyUrl = import.meta.env.VITE_FOUNDERY_OS_URL || 'https://foundery.helloworlddao.com';
        window.location.href = `${founderyUrl}/login?verified=true`;
      }
    } else {
      throw new Error(result.message || 'Verification failed');
    }
  };

  const handleResend = async () => {
    const result = await resendVerificationCode(email);
    if (!result.success) {
      throw new Error(result.message || 'Failed to resend code');
    }
  };

  const handleCancel = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="max-w-md w-full">
        <VerificationCodeForm
          email={email}
          onVerify={handleVerify}
          onResend={handleResend}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

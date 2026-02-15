import { useSearchParams, useNavigate } from 'react-router-dom';
import { VerificationCodeForm } from '@/components/VerificationCodeForm';
import { useUserService } from '@/hooks/useUserService';

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
      // Redirect to login after successful verification
      const founderyUrl = import.meta.env.VITE_FOUNDERY_OS_URL || 'https://staging-foundery.helloworlddao.com';
      window.location.href = `${founderyUrl}/login`;
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

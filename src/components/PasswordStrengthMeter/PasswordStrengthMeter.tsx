import { useMemo } from 'react';
import {
  validatePassword,
  checkPasswordPatterns,
  PasswordStrength,
} from '@/utils/password-validation';
import { cn } from '@/utils/cn';

interface PasswordStrengthMeterProps {
  password: string;
  showFeedback?: boolean;
  className?: string;
}

/**
 * Visual password strength meter with real-time feedback
 * Matches backend validation requirements from user-service
 * Uses plain text indicators instead of lucide-react icons
 */
export default function PasswordStrengthMeter({
  password,
  showFeedback = true,
  className = '',
}: PasswordStrengthMeterProps) {
  const analysis = useMemo(() => {
    if (!password) {
      return null;
    }

    const result = validatePassword(password);
    const warnings = checkPasswordPatterns(password);

    return { result, warnings };
  }, [password]);

  // Don't show anything if password is empty
  if (!password || !analysis) {
    return null;
  }

  const { result, warnings } = analysis;

  // Determine color based on strength
  const getStrengthColor = (strength: PasswordStrength): string => {
    switch (strength) {
      case PasswordStrength.WEAK:
        return 'bg-red-500';
      case PasswordStrength.FAIR:
        return 'bg-orange-500';
      case PasswordStrength.GOOD:
        return 'bg-yellow-500';
      case PasswordStrength.STRONG:
        return 'bg-green-500';
    }
  };

  const getStrengthText = (strength: PasswordStrength): string => {
    switch (strength) {
      case PasswordStrength.WEAK:
        return 'Weak';
      case PasswordStrength.FAIR:
        return 'Fair';
      case PasswordStrength.GOOD:
        return 'Good';
      case PasswordStrength.STRONG:
        return 'Strong';
    }
  };

  const getStrengthTextColor = (strength: PasswordStrength): string => {
    switch (strength) {
      case PasswordStrength.WEAK:
        return 'text-red-600';
      case PasswordStrength.FAIR:
        return 'text-orange-600';
      case PasswordStrength.GOOD:
        return 'text-yellow-600';
      case PasswordStrength.STRONG:
        return 'text-green-600';
    }
  };

  const strengthColor = getStrengthColor(result.strength);
  const strengthText = getStrengthText(result.strength);
  const strengthTextColor = getStrengthTextColor(result.strength);

  return (
    <div className={cn('space-y-2', className)} data-testid="password-strength-meter">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', strengthColor)}
            style={{ width: `${result.score}%` }}
            data-testid="strength-bar"
          />
        </div>
        <span className={cn('text-sm font-medium', strengthTextColor)} data-testid="strength-text">
          {strengthText}
        </span>
      </div>

      {/* Feedback messages */}
      {showFeedback && (
        <div className="space-y-1">
          {/* Requirements feedback (errors) */}
          {result.feedback.length > 0 && (
            <div className="space-y-1">
              {result.feedback.map((message, index) => (
                <div
                  key={`feedback-${index}`}
                  className="flex items-start gap-2 text-sm text-red-600"
                >
                  <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
                    &#x2717;
                  </span>
                  <span>{message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pattern warnings (suggestions) */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div
                  key={`warning-${index}`}
                  className="flex items-start gap-2 text-sm text-amber-600"
                >
                  <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
                    &#x26A0;
                  </span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Success message */}
          {result.isValid && warnings.length === 0 && (
            <div className="flex items-start gap-2 text-sm text-green-600">
              <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
                &#x2713;
              </span>
              <span>Password meets all requirements</span>
            </div>
          )}
        </div>
      )}

      {/* Requirements checklist (compact view) */}
      {!showFeedback && (
        <div className="flex flex-wrap gap-2 text-xs">
          <RequirementBadge met={password.length >= 12} label="12+ chars" />
          <RequirementBadge met={/[A-Z]/.test(password)} label="Uppercase" />
          <RequirementBadge met={/[a-z]/.test(password)} label="Lowercase" />
          <RequirementBadge met={/[0-9]/.test(password)} label="Number" />
          <RequirementBadge met={/[^a-zA-Z0-9]/.test(password)} label="Special" />
        </div>
      )}
    </div>
  );
}

interface RequirementBadgeProps {
  met: boolean;
  label: string;
}

function RequirementBadge({ met, label }: RequirementBadgeProps) {
  return (
    <span
      className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        met ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      )}
    >
      {met ? '\u2713' : '\u25CB'} {label}
    </span>
  );
}

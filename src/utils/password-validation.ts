import { z } from 'zod';

/**
 * Password validation constants (must match backend requirements)
 * Backend: user-service/src/auth_types.rs
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Password strength levels for UI feedback
 */
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
}

/**
 * Password strength result with detailed feedback
 */
export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string[];
  isValid: boolean;
}

/**
 * Validate password against backend requirements
 * Requirements (must match user-service/src/password.rs):
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (non-alphanumeric)
 *
 * @param password - Password to validate
 * @returns Validation result with detailed feedback
 */
export function validatePassword(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    feedback.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  } else {
    score += 20;
  }

  // Check maximum length
  if (password.length > MAX_PASSWORD_LENGTH) {
    feedback.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
    return {
      strength: PasswordStrength.WEAK,
      score: 0,
      feedback,
      isValid: false,
    };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 20;
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 20;
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 20;
  }

  // Check for special character (non-alphanumeric)
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else {
    score += 20;
  }

  // Bonus points for additional complexity
  if (password.length >= 16) {
    score += 5; // Longer password
  }
  if (password.length >= 20) {
    score += 5; // Very long password
  }

  // Check for multiple special characters
  const specialCharCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;
  if (specialCharCount >= 2) {
    score += 5;
  }

  // Check for uppercase/lowercase diversity
  const upperCount = (password.match(/[A-Z]/g) || []).length;
  const lowerCount = (password.match(/[a-z]/g) || []).length;
  if (upperCount >= 2 && lowerCount >= 2) {
    score += 5;
  }

  // Determine strength based on score
  let strength: PasswordStrength;
  if (score < 50) {
    strength = PasswordStrength.WEAK;
  } else if (score < 70) {
    strength = PasswordStrength.FAIR;
  } else if (score < 90) {
    strength = PasswordStrength.GOOD;
  } else {
    strength = PasswordStrength.STRONG;
  }

  // Password is valid only if all requirements are met (feedback is empty)
  const isValid = feedback.length === 0;

  return {
    strength,
    score: Math.min(score, 100),
    feedback,
    isValid,
  };
}

/**
 * Zod schema for password validation (for form validation)
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`)
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine((password) => /[0-9]/.test(password), 'Password must contain at least one number')
  .refine(
    (password) => /[^a-zA-Z0-9]/.test(password),
    'Password must contain at least one special character'
  );

/**
 * Hash IP address using SHA-256 for rate limiting
 * @param ipAddress - IP address to hash
 * @returns Hexadecimal hash string (64 characters)
 */
export async function hashIpAddress(ipAddress: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ipAddress);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Check if password contains common patterns (dictionary words, sequences, etc.)
 * @param password - Password to check
 * @returns Array of warnings about common patterns
 */
export function checkPasswordPatterns(password: string): string[] {
  const warnings: string[] = [];

  // Check for sequential characters (e.g., "abc", "123")
  if (
    /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
      password
    )
  ) {
    warnings.push('Avoid sequential letters (abc, xyz, etc.)');
  }
  if (/(?:012|123|234|345|456|567|678|789)/.test(password)) {
    warnings.push('Avoid sequential numbers (123, 456, etc.)');
  }

  // Check for repeated characters (e.g., "aaa", "111")
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Avoid repeating the same character multiple times');
  }

  // Check for common patterns
  const commonPatterns = [
    'password',
    'pass',
    'admin',
    'user',
    'login',
    'welcome',
    'qwerty',
    'asdf',
    'zxcv',
    '1234',
    'abcd',
  ];

  const lowerPassword = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      warnings.push(`Avoid common words like "${pattern}"`);
      break; // Only show one common word warning
    }
  }

  return warnings;
}

/**
 * Get comprehensive password feedback (validation + pattern warnings)
 * @param password - Password to analyze
 * @returns Combined feedback from validation and pattern checking
 */
export function getPasswordFeedback(password: string): {
  result: PasswordStrengthResult;
  warnings: string[];
} {
  const result = validatePassword(password);
  const warnings = checkPasswordPatterns(password);

  return {
    result,
    warnings,
  };
}

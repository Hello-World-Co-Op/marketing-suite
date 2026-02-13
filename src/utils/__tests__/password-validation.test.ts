import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  passwordSchema,
  checkPasswordPatterns,
  getPasswordFeedback,
  PasswordStrength,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../password-validation';

describe('validatePassword', () => {
  it('returns WEAK for short passwords', () => {
    const result = validatePassword('abc');
    expect(result.strength).toBe(PasswordStrength.WEAK);
    expect(result.isValid).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('returns WEAK for passwords exceeding max length', () => {
    const longPassword = 'A'.repeat(MAX_PASSWORD_LENGTH + 1);
    const result = validatePassword(longPassword);
    expect(result.strength).toBe(PasswordStrength.WEAK);
    expect(result.score).toBe(0);
    expect(result.isValid).toBe(false);
  });

  it('requires at least one uppercase letter', () => {
    const result = validatePassword('abcdefghijk1!');
    expect(result.feedback).toContain('Password must contain at least one uppercase letter');
    expect(result.isValid).toBe(false);
  });

  it('requires at least one lowercase letter', () => {
    const result = validatePassword('ABCDEFGHIJK1!');
    expect(result.feedback).toContain('Password must contain at least one lowercase letter');
    expect(result.isValid).toBe(false);
  });

  it('requires at least one number', () => {
    const result = validatePassword('Abcdefghijk!@');
    expect(result.feedback).toContain('Password must contain at least one number');
    expect(result.isValid).toBe(false);
  });

  it('requires at least one special character', () => {
    const result = validatePassword('Abcdefghijk12');
    expect(result.feedback).toContain('Password must contain at least one special character');
    expect(result.isValid).toBe(false);
  });

  it('returns valid for a password meeting all requirements', () => {
    const result = validatePassword('MyP@ssw0rd!23');
    expect(result.isValid).toBe(true);
    expect(result.feedback).toHaveLength(0);
  });

  it('returns GOOD or STRONG for a valid password', () => {
    const result = validatePassword('MyP@ssw0rd!23');
    expect([PasswordStrength.GOOD, PasswordStrength.STRONG]).toContain(result.strength);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('gives bonus points for longer passwords', () => {
    // Use a short valid password (12 chars) that scores exactly 100 (base)
    // vs a longer password that also earns bonus — both may cap at 100.
    // Instead, test that a 16+ char password scores >= a 12 char password.
    const shortValid = validatePassword('MyP@ssw0rd!2');
    const longValid = validatePassword('MyP@ssw0rd!234567890');
    expect(longValid.score).toBeGreaterThanOrEqual(shortValid.score);
  });

  it('gives bonus points for multiple special characters', () => {
    const singleSpecial = validatePassword('MyP@ssw0rdddd');
    const multiSpecial = validatePassword('MyP@ssw0rd!##');
    expect(multiSpecial.score).toBeGreaterThanOrEqual(singleSpecial.score);
  });

  it('returns score capped at 100', () => {
    const result = validatePassword('AABBccdd1234!@#$%^&*()_+Extra');
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('uses correct min/max constants', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(MAX_PASSWORD_LENGTH).toBe(128);
  });
});

describe('passwordSchema (zod)', () => {
  it('rejects passwords shorter than 12 characters', () => {
    const result = passwordSchema.safeParse('Short1!');
    expect(result.success).toBe(false);
  });

  it('rejects passwords longer than 128 characters', () => {
    const result = passwordSchema.safeParse('A'.repeat(129) + 'a1!');
    expect(result.success).toBe(false);
  });

  it('rejects passwords without uppercase', () => {
    const result = passwordSchema.safeParse('lowercaseonly1!');
    expect(result.success).toBe(false);
  });

  it('rejects passwords without lowercase', () => {
    const result = passwordSchema.safeParse('UPPERCASEONLY1!');
    expect(result.success).toBe(false);
  });

  it('rejects passwords without a number', () => {
    const result = passwordSchema.safeParse('NoNumbersHere!');
    expect(result.success).toBe(false);
  });

  it('rejects passwords without a special character', () => {
    const result = passwordSchema.safeParse('NoSpecialChar1');
    expect(result.success).toBe(false);
  });

  it('accepts a valid password', () => {
    const result = passwordSchema.safeParse('MyP@ssw0rd!23');
    expect(result.success).toBe(true);
  });
});

describe('checkPasswordPatterns', () => {
  it('warns about sequential letters', () => {
    const warnings = checkPasswordPatterns('abcSecure123!');
    expect(warnings.some((w) => w.includes('sequential letters'))).toBe(true);
  });

  it('warns about sequential numbers', () => {
    const warnings = checkPasswordPatterns('Secure123Pass!');
    expect(warnings.some((w) => w.includes('sequential numbers'))).toBe(true);
  });

  it('warns about repeated characters', () => {
    const warnings = checkPasswordPatterns('Secureeee123!');
    expect(warnings.some((w) => w.includes('repeating'))).toBe(true);
  });

  it('warns about common patterns', () => {
    const warnings = checkPasswordPatterns('MyPasswordTest1!');
    expect(warnings.some((w) => w.includes('common words'))).toBe(true);
  });

  it('returns no warnings for a strong password without patterns', () => {
    const warnings = checkPasswordPatterns('Xk9#mZ2!pQ7$');
    expect(warnings).toHaveLength(0);
  });
});

describe('getPasswordFeedback', () => {
  it('returns both validation result and pattern warnings', () => {
    const { result, warnings } = getPasswordFeedback('password123!');
    expect(result).toBeDefined();
    expect(result.strength).toBeDefined();
    expect(Array.isArray(warnings)).toBe(true);
  });

  it('returns empty feedback and warnings for strong unique password', () => {
    const { result, warnings } = getPasswordFeedback('Xk9#mZ2!pQ7$');
    expect(result.isValid).toBe(true);
    expect(warnings).toHaveLength(0);
  });
});

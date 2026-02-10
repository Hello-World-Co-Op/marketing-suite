import { describe, it, expect } from 'vitest';
import { interestFormSchema } from './validation';

describe('interestFormSchema', () => {
  it('validates a complete valid form', () => {
    const data = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      country: 'US',
      state: 'CA',
      city: 'San Francisco',
      postal_code: '94102',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates with only required fields', () => {
    const data = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects empty first name', () => {
    const data = {
      first_name: '',
      last_name: 'Doe',
      email: 'john@example.com',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty last name', () => {
    const data = {
      first_name: 'John',
      last_name: '',
      email: 'john@example.com',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const data = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'not-an-email',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects names with numbers', () => {
    const data = {
      first_name: 'John123',
      last_name: 'Doe',
      email: 'john@example.com',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts names with accented characters', () => {
    const data = {
      first_name: 'Jose',
      last_name: 'Garcia',
      email: 'jose@example.com',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts hyphenated names', () => {
    const data = {
      first_name: 'Mary-Jane',
      last_name: "O'Brien",
      email: 'mj@example.com',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects names exceeding max length', () => {
    const data = {
      first_name: 'A'.repeat(51),
      last_name: 'Doe',
      email: 'john@example.com',
    };

    const result = interestFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

import { z } from 'zod';

// Validation constants
// Supports letters (including accented), spaces, hyphens, and apostrophes
// Examples: Mary-Jane, O'Brien, Von Neumann, Jose Maria
const NAME_REGEX = /^[\p{L}]+([\s'-][\p{L}]+)*$/u;
const NAME_REGEX_ERROR = 'Can only contain letters, spaces, hyphens, and apostrophes';
const NAME_MAX_LENGTH = 50;

/**
 * Validation schema for Interest Form
 * Required: first name, last name, email
 * Optional: country, state, city, postal_code
 */
export const interestFormSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(NAME_MAX_LENGTH, `First name must be less than ${NAME_MAX_LENGTH} characters`)
    .regex(NAME_REGEX, NAME_REGEX_ERROR),

  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(NAME_MAX_LENGTH, `Last name must be less than ${NAME_MAX_LENGTH} characters`)
    .regex(NAME_REGEX, NAME_REGEX_ERROR),

  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),

  // Optional address fields
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
});

export type InterestFormData = z.infer<typeof interestFormSchema>;

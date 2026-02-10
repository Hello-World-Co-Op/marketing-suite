/**
 * Postal code validation formats by country
 * Based on ISO 3166-1 country codes
 */

export interface PostalCodeFormat {
  regex: RegExp;
  example: string;
  format: (input: string) => string;
}

export const postalCodeFormats: Record<string, PostalCodeFormat> = {
  US: {
    regex: /^\d{5}(-\d{4})?$/,
    example: '90210',
    format: (input: string) => {
      const cleaned = input.replace(/\D/g, '');
      if (cleaned.length > 5) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
      }
      return cleaned;
    },
  },
  GB: {
    regex: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    example: 'SW1A 1AA',
    format: (input: string) => {
      const cleaned = input.toUpperCase().replace(/\s/g, '');
      if (cleaned.length > 4) {
        return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
      }
      return cleaned;
    },
  },
  CA: {
    regex: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
    example: 'K1A 0B1',
    format: (input: string) => {
      const cleaned = input.toUpperCase().replace(/\s/g, '');
      if (cleaned.length > 3) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      }
      return cleaned;
    },
  },
  DE: {
    regex: /^\d{5}$/,
    example: '10115',
    format: (input: string) => input.replace(/\D/g, '').slice(0, 5),
  },
  FR: {
    regex: /^\d{5}$/,
    example: '75001',
    format: (input: string) => input.replace(/\D/g, '').slice(0, 5),
  },
  AU: {
    regex: /^\d{4}$/,
    example: '2000',
    format: (input: string) => input.replace(/\D/g, '').slice(0, 4),
  },
  BR: {
    regex: /^\d{5}-?\d{3}$/,
    example: '01310-100',
    format: (input: string) => {
      const cleaned = input.replace(/\D/g, '');
      if (cleaned.length > 5) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
      }
      return cleaned;
    },
  },
};

/**
 * Get postal code example for a country
 */
export function getPostalCodeExample(countryCode: string): string {
  return postalCodeFormats[countryCode]?.example || '';
}

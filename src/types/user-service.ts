/**
 * Type definitions for user-service canister (marketing-suite subset)
 * Only includes types needed for waitlist signup and email verification
 */

// Encryption type for interest form PII
export type EncryptionType = { Temporary: null } | { UserDerived: null };

export interface IndividualRequest {
  // Encrypted PII fields (base64-encoded)
  email_encrypted: string;
  first_name_encrypted: string;
  last_name_encrypted: string;

  // Email hash for lookup/audit (SHA-256 hex)
  email_hash: string;

  // Encryption metadata
  encryption_key_id: string;
  encryption_type: EncryptionType;

  // Plaintext email for verification only (not stored)
  email_plaintext_for_verification: string;
}

export interface IndividualResult {
  success: boolean;
  message: string;
  id: [string] | [];
}

export interface VerifyResult {
  success: boolean;
  message: string;
}

export interface Stats {
  total_individuals: bigint;
  verified_individuals: bigint;
  pending_verifications: bigint;
}

export interface AddressRequest {
  address_type: { Home: null } | { Work: null } | { Billing: null } | { Shipping: null } | { Other: string };
  country: string;
  state: [string] | [];
  city: string;
  postal_code: string;
  street_address: [string] | [];
  street_address2: [string] | [];
  is_primary: boolean;
}

export interface UserServiceActor {
  submit_individual: (
    request: IndividualRequest,
    address?: [AddressRequest] | []
  ) => Promise<IndividualResult>;
  verify_email: (token: string) => Promise<VerifyResult>;
  verify_code?: (
    email: string,
    code: string,
    firstName: string,
    lastName: string
  ) => Promise<VerifyResult>;
  resend_verification_code?: (email: string) => Promise<VerifyResult>;
  get_stats: () => Promise<Stats>;
}

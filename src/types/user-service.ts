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

// Auth method types supported by user-service
export type AuthMethodType =
  | { EmailPassword: null }
  | { InternetIdentity: null }
  | { Google: null }
  | { Apple: null }
  | { Microsoft: null }
  | { GitHub: null }
  | { Discord: null };

// Registration request for email/password auth (Story 2.1.2, BL-011.2)
export interface RegisterEmailPasswordRequest {
  email_encrypted: string;
  first_name_encrypted: string;
  last_name_encrypted: string;
  email_hash: string;
  password: string;
  encryption_key_id: string;
  encrypted_recovery_key: string;
  password_salt: string;
  email_plaintext_for_verification: string;
  ip_hash: [string] | [];
  // BL-011.2: DOB fields for COPPA compliance
  dob_encrypted: string;
  dob_plaintext_for_validation: string;
  // FOS-3.3.1: Optional CRM fields for lead tracking (Candid opt encoding)
  company: [string] | [];
  job_title: [string] | [];
  interest_area: [string] | [];
  referral_source: [string] | [];
  // BL-028.2: Optional display name (unencrypted plaintext, NOT PII).
  // Stored as-is in user-service Profile for cross-suite session display (dashboard
  // greetings, navigation). Unlike first_name_encrypted, this is intentionally public.
  // Uses Candid opt encoding: [value] for Some, [] for None.
  display_name: [string] | [];
}

// Authentication response from user-service
export interface AuthResponse {
  success: boolean;
  message: string;
  access_token: [string] | [];
  refresh_token: [string] | [];
  session_id: [string] | [];
  user_id: [string] | [];
  preferred_auth_method: [AuthMethodType] | [];
  encrypted_recovery_key: [Uint8Array | number[]] | [];
  password_salt: [Uint8Array | number[]] | [];
  email_encrypted: [Uint8Array | number[]] | [];
  first_name_encrypted: [Uint8Array | number[]] | [];
  last_name_encrypted: [Uint8Array | number[]] | [];
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
  register_email_password?: (
    request: RegisterEmailPasswordRequest
  ) => Promise<{ Ok: AuthResponse } | { Err: string }>;
}

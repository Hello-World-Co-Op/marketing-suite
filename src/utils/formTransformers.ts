import type { InterestFormData } from './validation';
import type { IndividualRequest } from '../types/user-service';
import { hashEmail, encryptText, requestTemporaryKey } from './crypto';

/**
 * Transform interest form data to canister request format with client-side encryption
 * Requests temporary encryption key from oracle-bridge and encrypts PII
 *
 * @param data - Form data from InterestForm
 * @param canisterId - User-service canister ID (reads from VITE_USER_SERVICE_CANISTER_ID if not provided)
 * @returns Object with encrypted individual request (no address)
 */
export async function transformToIndividualRequest(
  data: InterestFormData,
  canisterId: string = import.meta.env.VITE_USER_SERVICE_CANISTER_ID ||
    'rrkah-fqaaa-aaaaa-aaaaq-cai'
): Promise<{ individual: IndividualRequest; address?: undefined }> {
  // Generate email hash for secondary index lookup
  const emailHash = await hashEmail(data.email);

  // Request temporary encryption key from oracle-bridge
  const { encryption_key, key_id } = await requestTemporaryKey(emailHash, canisterId);

  // Encrypt PII fields using AES-256-GCM
  const [emailEncrypted, firstNameEncrypted, lastNameEncrypted] = await Promise.all([
    encryptText(data.email, encryption_key),
    encryptText(data.first_name, encryption_key),
    encryptText(data.last_name, encryption_key),
  ]);

  const individual: IndividualRequest = {
    // Encrypted PII (base64-encoded)
    email_encrypted: emailEncrypted,
    first_name_encrypted: firstNameEncrypted,
    last_name_encrypted: lastNameEncrypted,

    // Email hash for canister secondary index
    email_hash: emailHash,

    // Encryption metadata
    encryption_key_id: key_id,
    encryption_type: { Temporary: null },

    // Plaintext email for verification only (not stored in canister)
    email_plaintext_for_verification: data.email,
  };

  return { individual };
}

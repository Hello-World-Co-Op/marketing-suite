/**
 * Recovery Key Cryptography Utilities
 * Epic 2.5, Story 2-5-1: Canister-Managed Recovery Keys
 *
 * Implements envelope encryption for user data recovery:
 * - Master recovery key (256-bit random) encrypts PII
 * - Password-derived key (PBKDF2) encrypts master recovery key
 * - Zero-knowledge: Server never sees plaintext passwords, keys, or PII
 */

/**
 * Generate a cryptographically secure 256-bit master recovery key
 *
 * This key is used to encrypt user PII and is itself encrypted with
 * the password-derived key before being sent to the canister.
 *
 * @returns {Uint8Array} 32 bytes (256 bits) of cryptographically secure random data
 */
export function generateMasterRecoveryKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Generate a cryptographically secure 128-bit salt for PBKDF2
 *
 * Each user gets a unique salt to prevent rainbow table attacks.
 * Salt is stored alongside the encrypted recovery key.
 *
 * @returns {Uint8Array} 16 bytes (128 bits) of cryptographically secure random data
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Derive a 256-bit encryption key from a password using PBKDF2
 *
 * Parameters follow OWASP 2023 recommendations:
 * - Algorithm: PBKDF2 with HMAC-SHA-256
 * - Iterations: 100,000 (OWASP minimum for SHA-256)
 * - Key length: 256 bits (for AES-256-GCM)
 *
 * @param {string} password - User's plaintext password
 * @param {Uint8Array} salt - 128-bit random salt (unique per user)
 * @returns {Promise<CryptoKey>} AES-256 key derived from password
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import password as key material for PBKDF2
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false, // Not extractable
    ['deriveKey']
  );

  // Derive AES-256 key from password + salt
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000, // OWASP 2023 minimum for SHA-256
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256, // 256-bit key for AES-256-GCM
    },
    false, // Not extractable
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypt the master recovery key with the password-derived key
 *
 * Uses AES-256-GCM for authenticated encryption:
 * - 96-bit IV (generated randomly for each encryption)
 * - 128-bit authentication tag (prevents tampering)
 * - Returns IV + ciphertext + tag as base64 string
 *
 * @param {Uint8Array} recoveryKey - 256-bit master recovery key
 * @param {CryptoKey} passwordDerivedKey - Key derived from password via PBKDF2
 * @returns {Promise<string>} Base64-encoded (IV || ciphertext || tag)
 */
export async function encryptRecoveryKey(
  recoveryKey: Uint8Array,
  passwordDerivedKey: CryptoKey
): Promise<string> {
  // Generate random 96-bit IV (nonce) for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt recovery key with AES-256-GCM
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    passwordDerivedKey,
    recoveryKey as BufferSource
  );

  // Combine IV + ciphertext into single buffer
  const encryptedData = new Uint8Array(iv.length + ciphertext.byteLength);
  encryptedData.set(iv, 0);
  encryptedData.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64 for storage/transmission
  return btoa(String.fromCharCode(...encryptedData));
}

/**
 * Decrypt the master recovery key using the password-derived key
 *
 * Parses IV from the encrypted data and uses it to decrypt with AES-256-GCM.
 * Authentication tag is automatically verified during decryption.
 *
 * @param {string} encryptedRecoveryKeyBase64 - Base64-encoded (IV || ciphertext || tag)
 * @param {CryptoKey} passwordDerivedKey - Key derived from password via PBKDF2
 * @returns {Promise<Uint8Array>} Decrypted 256-bit master recovery key
 * @throws {Error} If decryption fails (wrong password or tampered data)
 */
export async function decryptRecoveryKey(
  encryptedRecoveryKeyBase64: string,
  passwordDerivedKey: CryptoKey
): Promise<Uint8Array> {
  // Decode base64 to binary
  const encryptedData = Uint8Array.from(atob(encryptedRecoveryKeyBase64), (c) => c.charCodeAt(0));

  // Extract IV (first 12 bytes) and ciphertext (remaining bytes)
  const iv = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);

  // Decrypt with AES-256-GCM (authentication tag is verified automatically)
  const decryptedKey = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    passwordDerivedKey,
    ciphertext
  );

  return new Uint8Array(decryptedKey);
}

/**
 * Client-side encryption utilities for interest form PII
 * Uses Web Crypto API for SHA-256 hashing and AES-256-GCM encryption
 */

/**
 * Generate SHA-256 hash of email address for canister secondary index
 * @param email - Email address to hash
 * @returns Hexadecimal hash string (64 characters)
 */
export async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Encrypt text using AES-256-GCM with provided hex key
 * @param plaintext - Text to encrypt
 * @param keyHex - 256-bit encryption key as hex string (64 characters)
 * @returns Base64-encoded encrypted data (contains IV + ciphertext + auth tag)
 */
export async function encryptText(plaintext: string, keyHex: string): Promise<string> {
  // Convert hex key to Uint8Array
  const keyBytes = hexToBytes(keyHex);

  // Import key for AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Generate random 12-byte IV (recommended for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the plaintext
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    key,
    plaintextBytes
  );

  // Combine IV + ciphertext (ciphertext already includes auth tag)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64
  return bytesToBase64(combined);
}

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert byte array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

/**
 * Request a temporary encryption key from oracle-bridge
 * @param emailHash - SHA-256 hash of user's email
 * @param canisterId - User-service canister ID
 * @returns Temporary encryption key info
 */
export interface TemporaryKeyResponse {
  encryption_key: string; // 64-char hex (256-bit)
  key_id: string; // UUID
}

export async function requestTemporaryKey(
  emailHash: string,
  canisterId: string
): Promise<TemporaryKeyResponse> {
  const oracleBridgeUrl = import.meta.env.VITE_ORACLE_BRIDGE_URL || 'http://localhost:8787';

  // Oracle bridge authenticates clients via CORS origin checking, not API tokens.
  // The origin header is automatically sent by the browser and validated server-side.
  const response = await fetch(`${oracleBridgeUrl}/kdf/temporary-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_hash: emailHash,
      canister_id: canisterId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to request temporary encryption key');
  }

  return response.json();
}

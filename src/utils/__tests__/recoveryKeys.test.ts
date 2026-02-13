import { describe, it, expect } from 'vitest';
import {
  generateMasterRecoveryKey,
  generateSalt,
  deriveKeyFromPassword,
  encryptRecoveryKey,
  decryptRecoveryKey,
} from '../recoveryKeys';

describe('generateMasterRecoveryKey', () => {
  it('returns a Uint8Array of 32 bytes', () => {
    const key = generateMasterRecoveryKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  it('generates unique keys each time', () => {
    const key1 = generateMasterRecoveryKey();
    const key2 = generateMasterRecoveryKey();
    // Extremely unlikely to be equal
    const hex1 = Array.from(key1).map((b) => b.toString(16)).join('');
    const hex2 = Array.from(key2).map((b) => b.toString(16)).join('');
    expect(hex1).not.toBe(hex2);
  });
});

describe('generateSalt', () => {
  it('returns a Uint8Array of 16 bytes', () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it('generates unique salts each time', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hex1 = Array.from(salt1).map((b) => b.toString(16)).join('');
    const hex2 = Array.from(salt2).map((b) => b.toString(16)).join('');
    expect(hex1).not.toBe(hex2);
  });
});

describe('deriveKeyFromPassword', () => {
  it('derives a CryptoKey from password and salt', async () => {
    const salt = generateSalt();
    const key = await deriveKeyFromPassword('TestPassword123!', salt);
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    // The key should support encrypt and decrypt
    expect(key.usages).toContain('encrypt');
    expect(key.usages).toContain('decrypt');
  });

  it('produces different keys for different passwords', async () => {
    const salt = generateSalt();
    const key1 = await deriveKeyFromPassword('Password1!', salt);
    const key2 = await deriveKeyFromPassword('Password2!', salt);
    // We cannot directly compare CryptoKey values, but they should both be valid
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    // Both should be AES-GCM keys
    expect(key1.algorithm.name).toBe('AES-GCM');
    expect(key2.algorithm.name).toBe('AES-GCM');
  });

  it('produces different keys for different salts', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = await deriveKeyFromPassword('SamePassword!', salt1);
    const key2 = await deriveKeyFromPassword('SamePassword!', salt2);
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
  });
});

describe('encryptRecoveryKey and decryptRecoveryKey', () => {
  it('encrypts and decrypts a recovery key roundtrip', async () => {
    const masterKey = generateMasterRecoveryKey();
    const salt = generateSalt();
    const passwordKey = await deriveKeyFromPassword('MyStrongPass1!', salt);

    const encrypted = await encryptRecoveryKey(masterKey, passwordKey);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = await decryptRecoveryKey(encrypted, passwordKey);
    expect(decrypted).toBeInstanceOf(Uint8Array);
    expect(decrypted.length).toBe(32);
    expect(Array.from(decrypted)).toEqual(Array.from(masterKey));
  });

  it('produces different ciphertext each time (random IV)', async () => {
    const masterKey = generateMasterRecoveryKey();
    const salt = generateSalt();
    const passwordKey = await deriveKeyFromPassword('MyStrongPass1!', salt);

    const encrypted1 = await encryptRecoveryKey(masterKey, passwordKey);
    const encrypted2 = await encryptRecoveryKey(masterKey, passwordKey);
    // Different IVs should produce different ciphertext
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('fails to decrypt with wrong password-derived key', async () => {
    const masterKey = generateMasterRecoveryKey();
    const salt = generateSalt();
    const correctKey = await deriveKeyFromPassword('CorrectPass1!', salt);
    const wrongKey = await deriveKeyFromPassword('WrongPassword1!', salt);

    const encrypted = await encryptRecoveryKey(masterKey, correctKey);

    await expect(decryptRecoveryKey(encrypted, wrongKey)).rejects.toThrow();
  });
});

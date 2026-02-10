import { describe, it, expect } from 'vitest';
import { hashEmail, encryptText } from './crypto';

describe('crypto utilities', () => {
  describe('hashEmail', () => {
    it('produces a 64-character hex string', async () => {
      const hash = await hashEmail('test@example.com');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces consistent hashes for the same email', async () => {
      const hash1 = await hashEmail('test@example.com');
      const hash2 = await hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('normalizes email to lowercase before hashing', async () => {
      const hash1 = await hashEmail('Test@Example.COM');
      const hash2 = await hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different emails', async () => {
      const hash1 = await hashEmail('alice@example.com');
      const hash2 = await hashEmail('bob@example.com');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('encryptText', () => {
    // Generate a test key (64 hex chars = 256 bits)
    const testKey = 'a'.repeat(64);

    it('produces a base64 string', async () => {
      const encrypted = await encryptText('Hello World', testKey);
      // Base64 should decode without error
      expect(() => atob(encrypted)).not.toThrow();
    });

    it('produces different ciphertext for the same plaintext (random IV)', async () => {
      const encrypted1 = await encryptText('Hello World', testKey);
      const encrypted2 = await encryptText('Hello World', testKey);
      // Due to random IV, outputs should differ
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('produces non-empty output', async () => {
      const encrypted = await encryptText('test', testKey);
      expect(encrypted.length).toBeGreaterThan(0);
    });
  });
});

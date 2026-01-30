import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/settings/encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt a string', async () => {
    const original = 'sk-ant-123456789';
    const encrypted = await encrypt(original);
    
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':'); // IV:Content format
    
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should handle empty strings', async () => {
    const original = '';
    const encrypted = await encrypt(original);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should throw error for invalid hash format', async () => {
    await expect(decrypt('invalid-hash')).rejects.toThrow('Invalid hash format');
  });
});

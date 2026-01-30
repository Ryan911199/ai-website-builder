import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const algorithm = 'aes-256-ctr';
const secretKey = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || 'default_secret_key_must_be_32_bytes_long_';

// Ensure key is 32 bytes
const getKey = async () => {
  return (await promisify(scrypt)(secretKey, 'salt', 32)) as Buffer;
};

export async function encrypt(text: string): Promise<string> {
  const key = await getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export async function decrypt(hash: string): Promise<string> {
  const key = await getKey();
  const [ivHex, contentHex] = hash.split(':');
  
  if (!ivHex || contentHex === undefined) {
    throw new Error('Invalid hash format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const content = Buffer.from(contentHex, 'hex');
  
  const decipher = createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
  
  return decrypted.toString();
}

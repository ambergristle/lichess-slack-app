import { createCipheriv, createDecipheriv } from 'crypto';
import { DynamicBuffer } from '@oslojs/binary';
import { decodeBase64 } from '@oslojs/encoding';

const ENCODED_KEY = process.env.ENCRYPTION_KEY;
if (!ENCODED_KEY) {
  throw new Error('ConfigurationError: Missing environment ENCRYPTION_KEY');
}

const CIPHER_KEY = decodeBase64(ENCODED_KEY);

export const decrypt = (encrypted: Uint8Array): Uint8Array => {
  if (encrypted.byteLength < 33) {
    throw new Error('Invalid Data');
  }

  const iv = encrypted.slice(0, 16);
  const decipher = createDecipheriv('aes-128-gcm', CIPHER_KEY, iv);

  const buffer = encrypted.slice(encrypted.byteLength - 16);
  decipher.setAuthTag(buffer);

  const decrypted = new DynamicBuffer(0);

  const something = encrypted.slice(16, encrypted.byteLength - 16);
  decrypted.write(decipher.update(something));
  decrypted.write(decipher.final());

  return decrypted.bytes();
};

export const decryptToString = (data: Uint8Array): string => {
  return new TextDecoder().decode(decrypt(data));
};

export const encrypt = (data: Uint8Array): Uint8Array => {
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);

  const cipher = createCipheriv('aes-128-gcm', CIPHER_KEY, iv);
  const encrypted = new DynamicBuffer(0);

  encrypted.write(iv);
  encrypted.write(cipher.update(data));
  encrypted.write(cipher.final());
  encrypted.write(cipher.getAuthTag());

  return encrypted.bytes();
};

export const encryptString = (data: string): Uint8Array => {
  return encrypt(new TextEncoder().encode(data));
};

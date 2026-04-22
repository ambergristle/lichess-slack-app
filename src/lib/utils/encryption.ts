import { createCipheriv, createDecipheriv } from 'crypto';
import { DynamicBuffer } from '@oslojs/binary';
import { decodeBase64 } from '@oslojs/encoding';

import { secret } from './env';


const getCypherKey = () => {
  const encoded = secret('ENCRYPTION_KEY');
  return decodeBase64(encoded);
};

export const decrypt = (encrypted: Uint8Array): Uint8Array => {
  if (encrypted.byteLength < 33) {
    throw new Error('Invalid Data');
  }

  const iv = encrypted.slice(0, 16);
  const decipher = createDecipheriv('aes-128-gcm', getCypherKey(), iv);

  const buffer = encrypted.slice(encrypted.byteLength - 16);
  decipher.setAuthTag(buffer);

  const decrypted = new DynamicBuffer(0);

  const something = encrypted.slice(16, encrypted.byteLength - 16);
  decrypted.write(Uint8Array.from(decipher.update(something)));
  decrypted.write(Uint8Array.from(decipher.final()));

  return decrypted.bytes();
};

export const encrypt = (data: Uint8Array): Uint8Array => {
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);

  const cipher = createCipheriv('aes-128-gcm', getCypherKey(), iv);

  const encrypted = new DynamicBuffer(0);

  encrypted.write(iv);
  encrypted.write(Uint8Array.from(cipher.update(data)));
  encrypted.write(Uint8Array.from(cipher.final()));
  encrypted.write(Uint8Array.from(cipher.getAuthTag()));

  return encrypted.bytes();
};

export const encryptString = (data: string): Uint8Array => {
  return encrypt(new TextEncoder().encode(data));
};

import { describe, expect, test } from 'bun:test';
import { decrypt, encrypt } from './encryption';

describe('Encryption', () => {
  test('Encrypts and decrypts data', () => {
    const data = 'demo';

    const encoded = new TextEncoder().encode(data);
    const encrypted = encrypt(encoded);

    expect(encrypted).not.toBe(encoded);

    const decrypted = decrypt(encrypted);
    expect(new TextDecoder().decode(decrypted))
      .toBe(new TextDecoder().decode(encoded));
  });
});

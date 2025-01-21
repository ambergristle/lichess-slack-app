import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';

const generateRandomBytes = (bytes = 20) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return array;
};

export const generateRowId = (data?: string): string => {
  const bytes = data
    ? sha256(new TextEncoder().encode(data))
    : generateRandomBytes();

  return encodeBase32LowerCaseNoPadding(bytes);
};

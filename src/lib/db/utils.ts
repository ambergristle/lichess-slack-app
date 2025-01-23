import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';

import { generateRandomBytes } from '../utils/auth';

/**
 * Hash token bytes using SHA-256, and return with base-32 encoding
 * @param token An optional source value, which can be matched in queries
 */
export const generateRowId = (token?: string): string => {
  const bytes = token
    ? sha256(new TextEncoder().encode(token))
    : generateRandomBytes();

  return encodeBase32LowerCaseNoPadding(bytes);
};

import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';

export const generateRowId = (): string => {
  const idBytes = new Uint8Array(20);
  crypto.getRandomValues(idBytes);
  return encodeBase32LowerCaseNoPadding(idBytes);
};

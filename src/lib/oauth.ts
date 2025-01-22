import { encodeBase64urlNoPadding }from '@oslojs/encoding';

export const generateRandomBytes = (bytes = 20) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return array;
};


export function generateState(): string {
  const randomValues = generateRandomBytes(32);
  return encodeBase64urlNoPadding(randomValues);
}

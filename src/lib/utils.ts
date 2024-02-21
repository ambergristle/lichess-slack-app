import { createHmac, timingSafeEqual } from 'crypto';

export const constructHref = (
  baseUrl: string, 
  params?: Record<string, string>
) => {
  const url = new URL(baseUrl);
    
  if (!params) return url.href;

  Object
    .entries(params)
    .forEach(([key, value]) => {
      /** @todo error handling */
      if (typeof value !== 'string') throw `Invalid parameter type ${typeof value}`;
      url.searchParams.set(key, value);
    });

  return url.href;
};

/**
 * A utility exposing the logic required to verify Slack signatures
 * using HMAC (Hash-based Message Authentication Code)
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_class_hmac
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_crypto_timingsafeequal_a_b
 */
export const hmac = {
  /**
   * Create a new hex-encoded HMAC using the provided secret and data
   * @param secret Secret key
   * @param data String data to include in token
   * @returns HMAC hex digest string
   */
  createDigest: (secret: string, data: string) => {
    return createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  },
  /**
   * Compare two strings using a time-constant algo, preventing malicious
   * users from using failure time delta to deduce character mismatch
   * @param hmacDigestA
   * @param hmacDigestB 
   * @returns boolean representing equality
   */
  safeCompareDigests: (hmacDigestA: string, hmacDigestB: string) => {
    const hmacBufferA = Buffer.from(hmacDigestA);
    const hmacBufferB = Buffer.from(hmacDigestB);
   
    return timingSafeEqual(hmacBufferA, hmacBufferB);
  }
}

export const unix = {
  fromDate: (date: Date) => {
    return `${Math.floor(date.valueOf() / 1000)}`
  },
  toDate: (timestamp: string) => {
    const epochSeconds = Number(timestamp);
    if (isNaN(epochSeconds)) throw new Error('Invalid timestamp');
    return epochSeconds * 1000
  }
}

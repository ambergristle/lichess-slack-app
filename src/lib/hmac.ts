import { createHmac, timingSafeEqual } from 'crypto';

/**
 * A utility exposing the logic required to verify Slack signatures
 * using HMAC (Hash-based Message Authentication Code)
 * @todo update links to bun
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_class_hmac
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_crypto_timingsafeequal_a_b
 */
export default {
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
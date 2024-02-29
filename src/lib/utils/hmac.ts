import { createHmac, timingSafeEqual, type BinaryToTextEncoding } from 'crypto';

/**
 * A utility exposing the logic required to verify Slack signatures
 * using HMAC (Hash-based Message Authentication Code)
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_class_hmac
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_crypto_timingsafeequal_a_b
 */
const hmac = {
  /**
   * Create a new hex-encoded HMAC using the provided secret and data
   * @param secret Secret key
   * @param data String data to include in token
   * @returns HMAC hex digest string
   */
  createDigest: (secret: string, data: string, encoding: BinaryToTextEncoding) => {
    return createHmac('sha256', secret)
      .update(data)
      .digest(encoding);
  },
  /**
   * Compare two strings using a time-constant algo, preventing malicious
   * users from using failure time delta to deduce character mismatch
   * @param hmacDigestA
   * @param hmacDigestB 
   * @returns boolean representing equality
   */
  compareDigests: (hmacDigestA: string, hmacDigestB: string) => {
    const hmacBufferA = Buffer.from(hmacDigestA);
    const hmacBufferB = Buffer.from(hmacDigestB);
   
    return timingSafeEqual(hmacBufferA, hmacBufferB);
  },
};

export default hmac;

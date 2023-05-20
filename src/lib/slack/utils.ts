import type { ICommandBlockResponse, ICommandTextResponse } from './schemas';

import crypto from 'node:crypto';

/**
 * HMAC - Hash-based Message Authentication Code
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_class_hmac
 * @see https://nodejs.org/docs/latest-v6.x/api/crypto.html#crypto_crypto_timingsafeequal_a_b
 */

/**
 * Create a new hex-encoded HMAC using the provided secret and data
 * @param secret Secret key
 * @param data String data to include in token
 * @returns HMAC hex digest string
 */
export const getHmacHexDigest = (secret: string, data: string) => {    
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
};

/**
 * Compare two strings using a time-constant algo, preventing malicious
 * users from using failure time delta to deduce character mismatch
 * @param hmacDigestA
 * @param hmacDigestB 
 * @returns boolean representing equality
 */
export const safeCompareHmacDigests = (
  hmacDigestA: string, 
  hmacDigestB: string,
) => {
  const hmacBufferA = Buffer.from(hmacDigestA);
  const hmacBufferB = Buffer.from(hmacDigestB);
   
  return crypto.timingSafeEqual(hmacBufferA, hmacBufferB);
};



export const helpCommandResponse: ICommandBlockResponse = {
  response_type: 'in_channel',
  text: '',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'hi',
      },
    },
  ],
};

export const puzzleCommandResponse: ICommandBlockResponse = {
  response_type: 'in_channel',
  text: '',
  blocks: [
    {
      type: 'image',
      title: { 
        type: 'plain_text',
        text: 'imgUrl', 
      },
      alt_text: '',
      image_url: '',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '',
      },
    },
  ],
};

export const setTimeCommandResponse: ICommandTextResponse = {
  response_type: 'in_channel',
  text: '',
};

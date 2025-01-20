import type { Context } from 'hono';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';

import { isString } from '@/lib/types';
import { getEnvironmentVariable } from './request';


const fiveSeconds = 5;
const verifySignature = (signature: string, secret: string) => {
  const payload = jwt.verify(signature, secret, {
    issuer: 'Upstash',
    clockTolerance: fiveSeconds,
  });

  if (isString(payload)) {
    throw new QStashError('Invalid Payload');
  }

  return payload;
};


/** @see https://upstash.com/docs/qstash/howto/signature */
export const verifyRequest = (c: Context, body: string, signature: string) => {
  try {
    let payload: jwt.JwtPayload;

    try {
      const currentKey = getEnvironmentVariable(c, 'QSTASH_CURRENT_SIGNING_KEY');
      payload = verifySignature(signature, currentKey);
    } catch {
      const nextKey = getEnvironmentVariable(c, 'QSTASH_NEXT_SIGNING_KEY');
      payload = verifySignature(signature, nextKey);
    }

    const baseUrl = getEnvironmentVariable(c, 'BASE_URL');
    if (payload.sub !== `${baseUrl}/webooks/scheduled-puzzle`) {
      throw new QStashError('Invalid Subject');
    }

    const trimHash = (hash: string) => {
      return hash.replace(/=+$/, '');
    };

    const bodyHash = createHash('sha256')
      .update(body)
      .digest('base64url');

    if (trimHash(payload.body) !== trimHash(bodyHash)) {
      throw new QStashError('Invalid Body');
    }
  } catch (cause) {
    if (cause instanceof QStashError) {
      throw cause;
    }

    throw new QStashError('Invalid Request', { cause });
  }
};


class QStashError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'QStashError';
  }
}

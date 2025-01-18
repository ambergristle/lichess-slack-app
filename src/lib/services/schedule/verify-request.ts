import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';

import config from '@/config';
import { isString } from '../../types';

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
export const verifyRequest = (body: string, signature: string) => {
  try {
    let payload: jwt.JwtPayload;

    try {
      payload = verifySignature(signature, config.QSTASH_CURRENT_SIGNING_KEY);
    } catch {
      payload = verifySignature(signature, config.QSTASH_NEXT_SIGNING_KEY);
    }

    if (payload.sub !== `${config.BASE_URL}/api/deliver`) {
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

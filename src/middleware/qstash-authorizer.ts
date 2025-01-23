import { createHash } from 'crypto';
import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { isString } from '@/lib/types';
import { AuthorizationError } from '@/lib/utils/errors';
import { QStashError } from '@/lib/services/qstash';
import { getEnvironmentVariable } from '@/lib/utils/request';


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
export const qStashAuthorizer = () => {
  return createMiddleware(async (c, next) => {
    // todo: could grab upstash-schedule-id instead of
    // passing the botId/locale in the payload
    const signature = c.req.header('upstash-signature');
    if (!signature) {
      throw new AuthorizationError('Request Unsigned');
    }

    const body = await c.req.text();

    let payload: jwt.JwtPayload;
    try {
      // eslint-disable-next-line max-len
      const currentKey = getEnvironmentVariable(c, 'QSTASH_CURRENT_SIGNING_KEY');
      payload = verifySignature(signature, currentKey);
    } catch {
      const nextKey = getEnvironmentVariable(c, 'QSTASH_NEXT_SIGNING_KEY');
      payload = verifySignature(signature, nextKey);
    }

    const baseUrl = getEnvironmentVariable(c, 'BASE_URL');
    if (payload.sub !== `${baseUrl}/webhooks/scheduled-puzzle`) {
      throw new QStashError('Invalid Subject');
    }

    const trimHash = (hash: string) => {
      return hash.replace(/=+$/, '');
    };

    try {
      const bodyHash = createHash('sha256')
        .update(body)
        .digest('base64url');

      if (trimHash(payload.body) !== trimHash(bodyHash)) {
        throw new QStashError('Invalid Body');
      }
    } catch (cause) {
      throw cause instanceof QStashError
        ? cause
        : new QStashError('Invalid Request', { cause });
    }

    await next();
  });
};

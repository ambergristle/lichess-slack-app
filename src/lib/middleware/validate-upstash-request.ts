import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';

import config from '@/config';


const verifyToken = (path: string, token: string, secret: string) => {
  try {
    const pauload = jwt.verify(token, secret);

    if (data.sub !== `${config.BASE_URL}${path}`) {
      throw new AuthorizationError('Path does not match claim');
    }

    const nowMilliseconds = new Date().getMilliseconds();

    if (data.exp < nowMilliseconds) {
      throw new AuthorizationError('Token expired');
    }

    if (data.nbf > nowMilliseconds) {
      throw new AuthorizationError('Token not yet valid');
    }

    const hash = createHash('sha256')
      .update(body)
      .digest('base64url');

    if (data.body !== `${hash}=`) {
      throw new AuthorizationError('Raw body does not match claim');
    }


  } catch (error) {
    //
  }
};

export const verifyUpstashRequest = () => {
  return createMiddleware(async (c, next) => {
    // upstash-schedule-id
    const token = c.req.header('upstash-signature');

    const arrayBuffer = await c.req.arrayBuffer();
    c.req.bodyCache.arrayBuffer = arrayBuffer;

    const body = await new Response(arrayBuffer).text();

    if (!token) {
      throw new AuthorizationError('Token is required');
    }

    const results = [
      config.QSTASH_CURRENT_SIGNING_KEY,
      config.QSTASH_NEXT_SIGNING_KEY,
    ].map((secret) => {
      return verifyToken(c.req.path, body, token, secret);
    });

    const payload = results
      .find(isValidResult);

    if (!payload) {
      const cause = results
        .find(isInvalidResult);

      throw new AuthorizationError('Invalid signature', { cause });
    }

    await next();
  });
};

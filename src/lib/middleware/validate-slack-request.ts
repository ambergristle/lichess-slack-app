import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import config from '@/config';
import { unix } from '@/lib/utils/dates';
import hmac from '@/lib/utils/hmac';


const ZSlackHeaders = z.object({
  'accept': z.string().optional(),
  'user-agent': z.string(),
  'x-slack-signature': z.string(),
  'x-slack-request-timestamp': z.string(),
}).transform((headers) => ({
  accept: headers.accept,
  userAgent: headers['user-agent'],
  signature: headers['x-slack-signature'],
  timestamp: headers['x-slack-request-timestamp'],
}));

/**
 * Protect against replay attacks by enforcing a maximum
 * time difference between todo
 * @param timestamp Unix timestamp
 * @returns boolean
 */
const validateTimestamp = (timestamp: string) => {
  // Future dates are invalid
  const millisecondDifference = Date.now() - unix.toDate(timestamp);
  if (millisecondDifference < 0) return false;
  // todo: Recommended expiration
  const oneMinuteMilliseconds = 1 * 60 * 1000;
  if (millisecondDifference > oneMinuteMilliseconds) return false;

  return true;
};


export const validateSlackRequest = () => {
  return createMiddleware(async (c, next) => {
    const {
      accept,
      userAgent,
      signature,
      timestamp,
    } = ZSlackHeaders.parse(c.req.header());

    const isFromSlackbot = !!userAgent?.includes(
      'Slackbot 1.0 (+https://api.slack.com/robots)',
    );

    if (!isFromSlackbot) {
      // todo: return response differently?
      throw new HTTPException(403, {
        message: 'Forbidden',
        // Invalid User Agent
      });
    }

    if (!accept?.includes('application/json')) {
      throw new HTTPException(415, {
        message: 'Returns JSON',
        // todo
      });
    }

    const body = await c.req.text();
    const signatureData = `v0:${timestamp}:${body}`;

    const expectedSignature = hmac.createDigest(
      config.SLACK_SIGNING_SECRET,
      signatureData,
      'hex',
    );

    const timestampIsValid = validateTimestamp(timestamp);
    const signatureIsValid = hmac.compareDigests(
      `v0=${expectedSignature}`,
      signature,
    );

    // Obscure implementation details by throwing
    // after both validations have resolved
    if (!timestampIsValid) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        // Invalid Timestamp
      });
    }

    if (!signatureIsValid) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        // Invalid Signature
      });
    }

    await next();
  });
};

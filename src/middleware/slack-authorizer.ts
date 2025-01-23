import { createMiddleware } from 'hono/factory';

import { unixMilliseconds } from '@/lib/utils/dates';
import { AuthorizationError } from '@/lib/utils/errors';
import { hmac } from '@/lib/utils/auth';
import { getEnvironmentVariable } from '@/lib/utils/request';


/**
 * Protect against replay attacks by requiring that timestamps
 * differ from local (server) time by no more than 5 minutes
 * @param timestamp Unix timestamp
 * @returns boolean
 */
const validateTimestamp = (timestamp: string) => {
  const millisecondDifference = Date.now() - unixMilliseconds(timestamp);
  if (millisecondDifference < 0) return false;
  if (millisecondDifference > 1000 * 60 * 5) return false;

  return true;
};


/**
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export const slackAuthorizer = () => {
  return createMiddleware(async (c, next) => {
    const {
      'user-agent': userAgent,
      'x-slack-signature': signature,
      'x-slack-request-timestamp': timestamp,
    } = c.req.header();

    const isFromSlackbot = !!userAgent?.includes(
      'Slackbot 1.0 (+https://api.slack.com/robots)'
    );

    const body = await c.req.text();
    const signatureData = `v0:${timestamp}:${body}`;

    const expectedSignature = hmac.createDigest(
      getEnvironmentVariable(c, 'SLACK_SIGNING_SECRET'),
      signatureData,
      'hex'
    );

    const timestampIsValid = validateTimestamp(`${timestamp}`);
    const signatureIsValid = hmac.compareDigests(
      `v0=${expectedSignature}`,
      `${signature}`
    );

    // Obscure implementation details by throwing
    // after both validations have resolved
    if (!isFromSlackbot) {
      throw new AuthorizationError('Invalid User Agent');
    }

    if (!signature || !timestamp) {
      throw new AuthorizationError('Request Unsigned');
    }

    if (!timestampIsValid) {
      throw new AuthorizationError('Invalid Timestamp');
    }

    if (!signatureIsValid) {
      throw new AuthorizationError('Invalid Signature');
    }

    await next();
  });
};

import { createHash } from 'crypto';
import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';

import config from '@/config';
import type { Schedule } from '@/lib/db/schema';
import type { ScheduledDeliveryRequestBody } from '@/lib/dtos/qstash';
import { secret } from '@/lib/utils/env';
import { AuthorizationError, Oops, ResponseError } from '@/lib/utils/errors';
import { createMiddleware } from 'hono/factory';

const QSTASH_BASE_URL = 'https://qstash.upstash.io/v2';

/**
 * Cancel a scheduled job to stop daily puzzle deliveries.
 * @see https://upstash.com/docs/qstash/api-reference/schedules/delete-a-schedule
 */
export const cancelJob = async (jobId: string) => {
  try {
    const res = await fetch(`${QSTASH_BASE_URL}/schedules/${jobId}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${secret('QSTASH_TOKEN')}`,
      },
    });

    if (res.status !== 200) {
      throw new ResponseError(await res.text(), {
        service: 'qstash',
        statusCode: res.status,
        headers: res.headers,
      });
    }
  } catch (cause) {
    throw Oops.fromError('Failed to cancel schedule', cause);
  }
};

/**
 * Schedule a callback to `/webhooks/schedule` with bot id and locale.
 * This triggers a daily puzzle message.
 * @see https://upstash.com/docs/qstash/api-reference/schedules/create-a-schedule
 * @param jobId Job upserted on ID
 */
export const scheduleJob = async (
  schedule: Pick<Schedule, 'jobId' | 'cron'>
) => {
  try {
    const body = JSON.stringify({
      jobId: schedule.jobId,
    } satisfies ScheduledDeliveryRequestBody);

    const redirectUrl = `${config.baseUrl}/webhooks/schedule`;
    const res = await fetch(
      `${QSTASH_BASE_URL}/schedules/${redirectUrl}`,
      {
        method: 'POST',
        body,
        headers: {
          authorization: `Bearer ${secret('QSTASH_TOKEN')}`,
          'content-type': 'application/json',
          'content-length': body.length.toString(),
          'upstash-cron': schedule.cron,
          'upstash-schedule-id': schedule.jobId,
        },
      }
    );

    const json = await res.json();
    if (!res.ok) {
      throw new ResponseError(json.error, {
        service: 'qstash',
        statusCode: res.status,
        headers: res.headers,
      });
    }

    const jobId = json.scheduleId;
    if (!jobId || typeof jobId !== 'string') {
      throw new ResponseError('Unexpected Create Schedule response', {
        service: 'qstash',
        statusCode: res.status,
        headers: res.headers,
        received: json,
      });
    }

    return jobId;
  } catch (cause) {
    throw Oops.fromError('Failed to schedule Daily Puzzle delivery', cause);
  }
};

/**
 * @see https://upstash.com/docs/qstash/howto/signature
 */
export const verifyQStashSignature = () => {
  const fiveSeconds = 5;
  const verifySignature = (signature: string, secret: string) => {
    const payload = jwt.verify(signature, secret, {
      issuer: 'Upstash',
      clockTolerance: fiveSeconds,
    });

    if (typeof payload === 'string') {
      throw new Oops('Signature unwrapped to string');
    }

    return payload;
  };

  return createMiddleware<{
    Variables: { qstashVerified?: boolean }
  }>(async (c: Context, next: Next) => {
    try {
      const signature = c.req.header('upstash-signature');
      if (!signature) {
        throw new AuthorizationError('Missing Upstash signature');
      }

      const body = await c.req.text();

      let payload: jwt.JwtPayload;
      try {
        const currentKey = secret('QSTASH_CURRENT_SIGNING_KEY');
        payload = verifySignature(signature, currentKey);
      } catch {
        const nextKey = secret('QSTASH_NEXT_SIGNING_KEY');
        payload = verifySignature(signature, nextKey);
      }

      if (payload.sub !== `${config.baseUrl}/webhooks/scheduled-puzzle`) {
        throw new AuthorizationError('Invalid token subject');
      }

      const trimHash = (hash: string) => {
        return hash.replace(/=+$/, '');
      };

      let bodyHash: string;
      try {
        bodyHash = createHash('sha256').update(body).digest('base64url');
      } catch {
        throw new AuthorizationError('Invalid token body');
      }

      if (trimHash(payload.body) !== trimHash(bodyHash)) {
        throw new AuthorizationError('Invalid token body');
      }

      c.set('qstashVerified', true);

      await next();
    } catch (cause) {
      throw Oops.fromError('Failed to verify QStash request', cause);
    }
  });
};

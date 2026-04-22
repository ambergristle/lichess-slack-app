import { createHash } from 'crypto';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import jwt from 'jsonwebtoken';

import config from '@/config';
import type { Schedule } from '@/lib/db/schema';
import type { ScheduledDeliveryRequestBody } from '@/lib/dtos/qstash';
import { secret } from '@/lib/utils/env';
import { KnownError } from '@/lib/utils/errors';

const QSTASH_BASE_URL = 'https://qstash.upstash.io/v2';

/**
 * Cancel a scheduled job to stop daily puzzle deliveries.
 * @see https://upstash.com/docs/qstash/api-reference/schedules/delete-a-schedule
 */
export const cancelJob = async (jobId: string) => {
  try {
    const response = await fetch(`${QSTASH_BASE_URL}/schedules/${jobId}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${secret('QSTASH_TOKEN')}`,
      },
    });

    if (response.status !== 200) {
      throw new KnownError(await response.text(), {
        cause: response,
      });
    }
  } catch (cause) {
    throw new KnownError('Failed to cancel schedule', { cause });
  }
};

/**
 * Schedule a callback to `/webhooks/schedule` with bot id and locale.
 * This triggers a daily puzzle message.
 * @see https://upstash.com/docs/qstash/api-reference/schedules/create-a-schedule
 * @param jobId Job upserted on ID
 */
export const scheduleJob = async (
  schedule: Pick<Schedule, 'jobId' | 'cron'>,
) => {
  try {
    const body = JSON.stringify({
      jobId: schedule.jobId,
    } satisfies ScheduledDeliveryRequestBody);

    const redirectUrl = `${config.baseUrl}/webhooks/schedule`;
    const response = await fetch(
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
      },
    );

    const json = await response.json();
    const jobId = json.scheduleId;
    if (!jobId || typeof jobId !== 'string') {
      throw new Error('Invalid response', { cause: response });
    }

    return jobId;
  } catch (cause) {
    throw new KnownError('Failed to schedule job', { cause });
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
      throw new HTTPException(400, { message: 'Invalid token' });
    }

    return payload;
  };

  return async (c: Context, next: Next) => {
    try {
      const signature = c.req.header('upstash-signature');
      if (!signature) {
        throw new HTTPException(401, { message: 'Missing Upstash signature' });
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
        throw new HTTPException(401, { message: 'Invalid token subject' });
      }

      const trimHash = (hash: string) => {
        return hash.replace(/=+$/, '');
      };

      let bodyHash: string;
      try {
        bodyHash = createHash('sha256').update(body).digest('base64url');
      } catch {
        throw new HTTPException(401, { message: 'Invalid token body' });
      }

      if (trimHash(payload.body) !== trimHash(bodyHash)) {
        throw new HTTPException(401, { message: 'Invalid token body' });
      }

      await next();
    } catch (cause) {
      const status = cause instanceof HTTPException ? cause.status : 500;

      throw new HTTPException(status, {
        cause,
      });
    }
  };
};

import { createHash } from 'crypto';
import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import config from '@/config';
import { env } from '@/lib/utils/request';
import { KnownError } from '@/lib/utils/errors';
import { HTTPException } from 'hono/http-exception';
import { Schedule } from '../db/schema';


/**
 * Cancel a scheduled job to stop daily puzzle deliveries.
 * @see https://upstash.com/docs/qstash/api-reference/schedules/delete-a-schedule
 */
export const cancelJob = async (jobId: string) => {
  try {
    const response = await fetch(`${config.qstashBaseUrl}/schedules/${jobId}`, {
      method: 'DELETE',
      headers: {
        'authorization': `Bearer ${env('QSTASH_TOKEN')}`,
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
 * todo?: Upstash-Forward-My-Header
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
    } satisfies SchedueldPuzzleJobData);

    const redirectUrl = `${env('BASE_URL')}/webhooks/schedule`;
    const response = await fetch(
      `${config.qstashBaseUrl}/schedules/${redirectUrl}`,
      {
        method: 'POST',
        body,
        headers: {
          'authorization': `Bearer ${env('QSTASH_TOKEN')}`,
          'content-type': 'application/json',
          'content-length': body.length.toString(),
          'upstash-cron': schedule.cron,
          'upstash-schedule-id': schedule.jobId,
        },
      }
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


type SchedueldPuzzleJobData = z.infer<typeof ZScheduledPuzzleJobData>
/**
 * Data included in the scheduled callback,
 * specifies everything required for puzzle delivery.
 * @see {scheduleJob}
 */
export const ZScheduledPuzzleJobData = z.object({
  jobId: z.string(),
}, {
  message: 'Invalid job response',
});


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
      // todo: could grab upstash-schedule-id instead of
      // passing the botId/locale in the payload
      const signature = c.req.header('upstash-signature');
      if (!signature) {
        throw new HTTPException(401, { message: 'Missing Upstash signature' });
      }

      const body = await c.req.text();

      let payload: jwt.JwtPayload;
      try {

        const currentKey = env('QSTASH_CURRENT_SIGNING_KEY');
        payload = verifySignature(signature, currentKey);
      } catch {
        const nextKey = env('QSTASH_NEXT_SIGNING_KEY');
        payload = verifySignature(signature, nextKey);
      }

      const baseUrl = env('BASE_URL');
      if (payload.sub !== `${baseUrl}/webhooks/scheduled-puzzle`) {
        throw new HTTPException(401, { message: 'Invalid token subject' });
      }

      const trimHash = (hash: string) => {
        return hash.replace(/=+$/, '');
      };

      let bodyHash: string;
      try {
        bodyHash = createHash('sha256')
          .update(body)
          .digest('base64url');
      } catch {
        throw new HTTPException(401, { message: 'Invalid token body' });
      }

      if (trimHash(payload.body) !== trimHash(bodyHash)) {
        throw new HTTPException(401, { message: 'Invalid token body' });
      }

      await next();
    } catch (cause) {
      const status = cause instanceof HTTPException
        ? cause.status
        : 500;

      throw new HTTPException(status, { cause });
    }
  };
};

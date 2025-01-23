import type { Context } from 'hono';
import wretch from 'wretch';
import { z } from 'zod';

import { getEnvironmentVariable } from '@/lib/utils/request';
import { KnownError } from '@/lib/utils/errors';
import { generateRowId } from '../db/utils';


/** QStash HTTP API Client */
const qStash = wretch('https://qstash.upstash.io/v2');


export const cancelScheduledJob = async (c: Context, jobId: string) => {
  const authToken = getEnvironmentVariable(c, 'QSTASH_TOKEN');

  const result = await qStash
    .auth(`Bearer ${authToken}`)
    .delete(`/schedules/${jobId}`)
    .res();

  if (result.status !== 200) {
    throw new KnownError('Schedule cancellation failed', {
      cause: result,
    });
  }
};


type ScheduledPuzzleData = z.infer<typeof ZScheduledPuzzleData>
export const ZScheduledPuzzleData = z.object({
  botId: z.string(),
  locale: z.string(),
}, {
  message: 'Invalid job data',
});


export const generateJobId = () => {
  return generateRowId();
};


/**
   * @see https://upstash.com/docs/qstash/api/schedules/create
   */
export const scheduleJob = async (
  c: Context,
  jobId: string,
  {
    cron,
    botId,
    locale,
  }: ScheduledPuzzleData & { cron: string; }
) => {
  const authToken = getEnvironmentVariable(c, 'QSTASH_TOKEN');

  const baseUrl = getEnvironmentVariable(c, 'BASE_URL');
  const redirectUrl = `${baseUrl}/webhooks/scheduled-puzzle`;

  // todo: callbackurl?
  // Upstash-Forward-My-Header
  const { scheduleId } = await qStash
    .auth(`Bearer ${authToken}`)
    .headers({
      'upstash-cron': cron,
      'upstash-schedule-id': jobId,
    })
    .post(
      { botId, locale },
      `/schedules/${redirectUrl}`
    )
    .json(
      z.object({
        scheduleId: z.string(),
      }, {
        message: 'Recieved invalid response',
      }).parse
    );

  return scheduleId;
};


export class QStashError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'QStashError';
  }
}

import wretch from 'wretch';
import { z } from 'zod';

import config from '@/config';


const callbackUrl = `${config.BASE_URL}/api/deliver`;

const qStash = wretch('https://qstash.upstash.io/v2');


const ZCreateScheduleResponse = z.object({
  scheduleId: z.string(),
}, {
  message: 'Recieved invalid response',
});

/**
 * @see https://upstash.com/docs/qstash/api/schedules/create
 */
export const createSchedule = async ({
  url,
  cron,
  data,
}: {
  url: string;
  cron: string;
  data: Record<string, unknown>;
}): Promise<{ scheduleId: string; }> => {
  // Upstash-Forward-My-Header
  return await qStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .headers({
      'upstash-cron': cron,
    })
    .post(data, `/schedules/${url}`)
    .json(ZCreateScheduleResponse.parse);
};

export const deleteSchedule = async (scheduleId: string) => {
  await qStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .delete(`/schedules/${scheduleId}`)
    .res();
};

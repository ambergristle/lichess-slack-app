import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import wretch from 'wretch';
import { z } from 'zod';

import { generatBotId } from './bot';
import { CronTime, stringifyCron, zonedToUtc } from './cron';
import { getDb } from './db';
import { ScheduledPuzzleJob } from './db/schema';
import { generateRowId } from './db/utils';
import { getEnvironmentVariable } from './request';
import { getUserTimeZone } from './slack';
import { cancelScheduledJob } from './qstash';
import { KnownError } from './errors';


/**
 *
 * QStash API Client
 *
 */

const qStash = wretch('https://qstash.upstash.io/v2');

export const generateScheduleId = (botId: string, userId: string) => {
  return generateRowId(`${botId}.${userId}`);
};


export const cancelBotSchedule = async (
  c: Context,
  botId: string,
  userId: string
) => {
  const scheduleId = generateScheduleId(botId, userId);

  const db = getDb(c);
  const [schedule] = await db
    .select({
      jobId: ScheduledPuzzleJob.jobId,
    })
    .from(ScheduledPuzzleJob)
    .where(eq(ScheduledPuzzleJob.id, scheduleId))
    .limit(1);

  if (!schedule) {
    throw new KnownError(`No Bot found with ID ${botId}`);
  }

  const result = await cancelScheduledJob(c, schedule.jobId);

  if (result.status !== 200) {
    throw new KnownError('Schedule cancellation failed', {
      cause: result,
    });
  }

  await db
    .delete(ScheduledPuzzleJob)
    .where(eq(ScheduledPuzzleJob.id, scheduleId));
};


const ZCreateScheduleResponse = z.object({
  scheduleId: z.string(),
}, {
  message: 'Recieved invalid response',
});

export const setBotSchedule = async (
  c: Context,
  channelId: string,
  userId: string,
  {
    selectedTime,
    locale,
    currentScheduleId,
  }: {
    selectedTime: CronTime,
    locale: string,
    currentScheduleId?: string
  }
) => {
  const botId = generatBotId(channelId);

  const authToken = getEnvironmentVariable(c, 'QSTASH_TOKEN');

  const baseUrl = getEnvironmentVariable(c, 'BASE_URL');
  const redirectUrl = `${baseUrl}/webhooks/scheduled-puzzle`;

  const timeZone = await getUserTimeZone(c, botId, userId);
  const { cronTime } = zonedToUtc(selectedTime, timeZone);
  const cron = stringifyCron(cronTime);

  /**
   * @see https://upstash.com/docs/qstash/api/schedules/create
   */

  // todo: callbackurl?
  // Upstash-Forward-My-Header
  const { scheduleId: jobId } = await qStash
    .auth(`Bearer ${authToken}`)
    .headers({
      'upstash-cron': cron,
    })
    .post({
      botId,
      locale,
    }, `/schedules/${redirectUrl}`)
    .json(ZCreateScheduleResponse.parse);

  const scheduleData = {
    updatedAt: new Date(),
    jobId,
    cron,
    timeZone,
  };

  // db retry or session
  const db = getDb(c);
  await db
    .insert(ScheduledPuzzleJob)
    .values({
      id: generateScheduleId(botId, userId),
      createdAt: scheduleData.updatedAt,
      userId,
      botId,
      ...scheduleData,
    })
    .onConflictDoUpdate({
      target: ScheduledPuzzleJob.id,
      set: {
        ...scheduleData,
      },
    });

  if (currentScheduleId) {
    await cancelScheduledJob(c, currentScheduleId);
  }

  return {
    utcCronTime: cronTime,
    timeZone,
  };
};

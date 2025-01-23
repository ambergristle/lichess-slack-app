import { eq } from 'drizzle-orm';
import type { Context } from 'hono';


import { getDb } from '@/lib/db';
import { ScheduledPuzzleJob } from '@/lib/db/schema';
import { generateRowId } from '@/lib/db/utils';
import { generatBotId } from '@/lib/entities/bot';
import { getUserTimeZone } from '@/lib/services/slack';
import {
  cancelScheduledJob,
  generateJobId,
  scheduleJob,
} from '@/lib/services/qstash';
import { CronTime, stringifyCron, zonedToUtc } from '@/lib/utils/cron';
import { KnownError } from '@/lib/utils/errors';


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

  await db.transaction(async (tx) => {
    await tx
      .delete(ScheduledPuzzleJob)
      .where(eq(ScheduledPuzzleJob.id, scheduleId));

    await cancelScheduledJob(c, schedule.jobId);
  });
};


export const setBotSchedule = async (
  c: Context,
  {
    channelId,
    userId,
    jobId = generateJobId(),
    selectedTime,
    locale,
  }: {
    channelId: string,
    userId: string,
    jobId?: string
    selectedTime: CronTime,
    locale: string,
  }
) => {
  const botId = generatBotId(channelId);

  const timeZone = await getUserTimeZone(c, botId, userId);

  const cronTime = zonedToUtc(selectedTime, timeZone);
  const cron = stringifyCron(cronTime);

  const scheduleData = {
    updatedAt: new Date(),
    jobId,
    cron,
    timeZone,
  };

  const db = getDb(c);
  await db.transaction(async (tx) => {
    await tx
      .insert(ScheduledPuzzleJob)
      .values({
        id: generateScheduleId(botId, userId),
        createdAt: scheduleData.updatedAt,
        botId,
        userId,
        ...scheduleData,
      })
      .onConflictDoUpdate({
        target: ScheduledPuzzleJob.id,
        set: {
          ...scheduleData,
        },
        setWhere: eq(ScheduledPuzzleJob.userId, userId),
      });

    await scheduleJob(c, jobId, { cron, botId, locale });
  });

  return {
    utcCronTime: cronTime,
    timeZone,
  };
};

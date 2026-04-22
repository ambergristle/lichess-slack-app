import { and, eq } from 'drizzle-orm';

import type { DB } from '@/lib/db';
import { BotChannel, ScheduledPuzzleJob } from '@/lib/db/schema';
import { generateRowId } from '@/lib/db/utils';
import { cancelJob, scheduleJob } from '@/lib/qstash';
import { formatCronExpression } from '@/lib/utils/cron';
import { KnownError } from '@/lib/utils/errors';

export const deleteSchedule = async (
  db: DB,
  botId: string,
  channelId: string,
) => {
  await db.transaction(async (tx) => {
    const result = await tx
      .delete(ScheduledPuzzleJob)
      .where(
        and(
          eq(ScheduledPuzzleJob.botId, botId),
          eq(ScheduledPuzzleJob.channelId, channelId),
        ),
      )
      .returning({
        jobId: ScheduledPuzzleJob.jobId,
      });

    if (result.length !== 1 || !result[0]) {
      throw new KnownError('Unexpected delete result: Multiple items found', {
        cause: result,
      });
    }

    await cancelJob(result[0].jobId);
  });
};

export const getSchedule = async (db: DB, jobId: string) => {
  const [schedule] = await db
    .select({
      jobId: ScheduledPuzzleJob.jobId,
      cron: ScheduledPuzzleJob.cron,
      timeZone: ScheduledPuzzleJob.timeZone,
      locale: ScheduledPuzzleJob.locale,
      deliveryUrl: ScheduledPuzzleJob.deliveryUrl,
    })
    .from(ScheduledPuzzleJob)
    .where(eq(ScheduledPuzzleJob.jobId, jobId));

  if (!schedule) {
    return null;
  }

  return schedule;
};

export const getScheduleCurrent = async (db: DB, jobId: string) => {
  const [schedule] = await db
    .select({
      jobId: ScheduledPuzzleJob.jobId,
      cron: ScheduledPuzzleJob.cron,
      timeZone: ScheduledPuzzleJob.timeZone,
    })
    .from(ScheduledPuzzleJob)
    .where(eq(ScheduledPuzzleJob.jobId, jobId));

  if (!schedule) {
    return null;
  }

  return schedule;
};

export const getScheduledDelivery = async (db: DB, scheduleId: string) => {
  const [schedule] = await db
    .select({
      locale: ScheduledPuzzleJob.locale,
      deliveryUrl: ScheduledPuzzleJob.deliveryUrl,
    })
    .from(ScheduledPuzzleJob)
    .where(eq(ScheduledPuzzleJob.jobId, scheduleId));

  if (!schedule) {
    return null;
  }

  return schedule;
};

/**
 * Upsert delivery schedule record and third-party job (on `jobId`).
 * @param db
 * @param scheduleData
 */
export const createSchedule = async (
  db: DB,
  {
    botId,
    channelId,
    cronTime,
    timeZone,
    locale,
  }: {
    botId: string;
    channelId: string;
    /** Job is upserted on ID */
    cronTime: { hour: number; minute: number };
    timeZone: string;
    locale: string;
  },
) => {
  await db.transaction(async (tx) => {
    const [botChannel] = await db
      .select({
        webhookUrl: BotChannel.webhookUrl,
      })
      .from(BotChannel)
      .where(
        and(eq(BotChannel.botId, botId), eq(BotChannel.channelId, channelId)),
      );

    if (!botChannel) {
      throw new KnownError('Invalid Bot Channel', {
        cause: { botId, channelId },
      });
    }

    const updatedAt = new Date();
    const updates = {
      cron: formatCronExpression(cronTime),
      timeZone,
      locale,
      deliveryUrl: botChannel.webhookUrl,
      updatedAt,
    };

    const [schedule] = await tx
      .insert(ScheduledPuzzleJob)
      .values({
        jobId: generateRowId(`${botId}:${channelId}`),
        botId,
        channelId,
        ...updates,
        createdAt: updatedAt,
      })
      .onConflictDoUpdate({
        target: ScheduledPuzzleJob.jobId,
        set: updates,
      })
      .returning({
        jobId: ScheduledPuzzleJob.jobId,
        cron: ScheduledPuzzleJob.cron,
      });

    if (!schedule) {
      throw new KnownError('Failed to insert schedule');
    }

    await scheduleJob(schedule);
  });
};

import { and, eq } from 'drizzle-orm';

import type { DB } from '@/lib/db';
import { BotChannel, ScheduledPuzzleJob, type Schedule } from '@/lib/db/schema';
import { generateRowId } from '@/lib/db/utils';
import { cancelJob, scheduleJob } from '@/lib/qstash';
import { formatCronExpression } from '@/lib/utils/cron';
import { Oops, PersistenceError } from '@/lib/utils/errors';

export const deleteSchedule = async (
  db: DB,
  botId: string,
  channelId: string
): Promise<void> => {
  try {
    await db.transaction(async (tx) => {
      const result = await tx
        .delete(ScheduledPuzzleJob)
        .where(
          and(
            eq(ScheduledPuzzleJob.botId, botId),
            eq(ScheduledPuzzleJob.channelId, channelId)
          )
        )
        .returning({
          jobId: ScheduledPuzzleJob.jobId,
        });

      if (result.length !== 1 || !result[0]) {
        throw new PersistenceError('Multiple items found', {
          identifier: { botId, channelId },
        });
      }

      await cancelJob(result[0].jobId);
    });
  } catch (cause) {
    throw Oops.fromError('Failed to cancel Schedule', cause);
  }
};

export const getSchedule = async (
  db: DB,
  jobId: string
): Promise<Nullable<Pick<Schedule, 'jobId' | 'cron' | 'timeZone'>>> => {
  try {
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
  } catch (cause) {
    throw new PersistenceError('Failed to get current Schedule', {
      identifier: { jobId },
      cause,
    });
  }
};

type Nullable<T> = T | null;

export const getScheduledDelivery = async (
  db: DB,
  scheduleId: string
): Promise<Nullable<Pick<Schedule, 'locale' | 'deliveryUrl'>>> => {
  try {
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
  } catch (cause) {
    throw new PersistenceError('Failed to get invoked Schedule', {
      identifier: { scheduleId },
      cause,
    });
  }
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
  }
): Promise<void> => {
  try {
    await db.transaction(async (tx) => {
      const [botChannel] = await db
        .select({
          webhookUrl: BotChannel.webhookUrl,
        })
        .from(BotChannel)
        .where(
          and(eq(BotChannel.botId, botId), eq(BotChannel.channelId, channelId))
        );

      if (!botChannel) {
        throw new PersistenceError('Invalid Bot Channel', {
          identifier: { botId, channelId },
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
        throw new PersistenceError('No Schedule returned');
      }

      await scheduleJob(schedule);
    });
  } catch (cause) {
    throw Oops.fromError('Failed to upsert Schedule', cause);
  }
};

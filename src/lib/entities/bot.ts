import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';

import { getDb } from '@/lib/db';
import { Bot, ScheduledPuzzleJob } from '@/lib/db/schema';
import { generateRowId } from '@/lib/db/utils';
import { completeRegistration } from '@/lib/services/slack';
import { decryptToString, encryptString } from '@/lib/utils/encryption';
import { AuthorizationError, KnownError } from '@/lib/utils/errors';


export const generatBotId = (channelId: string): string => {
  return generateRowId(channelId);
};


/** Bearer */
export const getBotAccessToken = async (c: Context, botId: string) => {
  const db = getDb(c);
  const [bot] = await db
    .select({
      accessToken: Bot.accessToken,
    })
    .from(Bot)
    .where(eq(Bot.id, botId))
    .limit(1);

  if (!bot) {
    throw new AuthorizationError(`No Bot found with ID ${botId}`);
  }

  return decryptToString(c, bot.accessToken);
};


export const getBotSchedule = async (
  c: Context,
  botId: string,
  scheduleId: string
) => {
  const db = getDb(c);
  const [result] = await db
    .select({
      webhookUrl: Bot.webhookUrl,
      schedule: {
        jobId: ScheduledPuzzleJob.jobId,
        cron: ScheduledPuzzleJob.cron,
        timeZone: ScheduledPuzzleJob.timeZone,
      },
    })
    .from(Bot)
    .leftJoin(
      ScheduledPuzzleJob,
      and(
        eq(ScheduledPuzzleJob.id, scheduleId),
        eq(Bot.id, ScheduledPuzzleJob.botId)
      )
    )
    .where(eq(Bot.id, botId))
    .limit(1);

  if (!result) {
    throw new AuthorizationError(`No Bot found with ID ${botId}`);
  }

  return result;
};


export const getBotWebhookUrl = async (c: Context, botId: string) => {
  const db = getDb(c);
  const [bot] = await db
    .select({
      webhookUrl: Bot.webhookUrl,
    })
    .from(Bot)
    .where(eq(Bot.id, botId))
    .limit(1);

  if (!bot) {
    throw new KnownError(`No Bot found with ID ${botId}`);
  }

  return bot.webhookUrl;
};


/**
 * Register Slack Bot
 * @see https://api.slack.com/methods/oauth.v2.access
 */
export const registerBot = async (c: Context, code: string) => {
  const {
    channelId,
    scope,
    accessToken,
    webhookUrl,
  } = await completeRegistration(c, code);
  console.log(accessToken);

  const botId = generatBotId(channelId);
  const now = new Date();

  const db = getDb(c);
  const result = await db
    .insert(Bot)
    .values({
      id: botId,
      createdAt: now,
      updatedAt: now,
      channelId,
      scope,
      accessToken: Buffer.from(encryptString(c, accessToken)),
      webhookUrl,
    });

  if (result.rowsAffected !== 1) {
    throw new Error('Unable to upsert bot', { cause: result });
  }
};

import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';
import { z } from 'zod';

import { getDb } from './db';
import { Bot, ScheduledPuzzleJob } from './db/schema';
import { decryptToString, encryptString } from './encryption';
import { getEnvironmentVariable } from './request';
import { generateScheduleId } from './schedule';
import {
  SlackError,
  getSlackAuthToken,
  slackClient,
  slackResponseBody,
} from './slack';
import { AuthorizationError, KnownError } from './errors';


/**
 * Hash token bytes using SHA-256, and return with base-32 encoding
 * @param token Created by {@linkcode generateAuthSessionToken}
 */
export const generatBotId = (teamId: string): string => {
  const hashedTokenBytes = sha256(new TextEncoder().encode(teamId));
  return encodeBase32LowerCaseNoPadding(hashedTokenBytes);
};

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

  return decryptToString(bot.accessToken);
};

export const getBotContext = async (c: Context, teamId: string, userId: string) => {
  const botId = generatBotId(teamId);

  // todo: merge queries
  const db = getDb(c);
  const [bot] = await db
    .select({
      id: Bot.id,
      appId: Bot.appId,
      channelId: Bot.channelId,
      webhookUrl: Bot.webhookUrl,
    })
    .from(Bot)
    .where(eq(Bot.id, botId))
    .limit(1);

  if (!bot) {
    throw new AuthorizationError(`No Bot found with ID ${botId}`);
  }

  const scheduleId = generateScheduleId(botId, userId);
  const [schedule] = await db
    .select({
      jobId: ScheduledPuzzleJob.jobId,
      cron: ScheduledPuzzleJob.cron,
      timeZone: ScheduledPuzzleJob.timeZone,
    })
    .from(ScheduledPuzzleJob)
    .where(eq(ScheduledPuzzleJob.id, scheduleId))
    .limit(1);


  const accessToken = await getBotAccessToken(c, botId);

  // https://api.slack.com/methods/conversations.info
  const { channel } = await slackClient
    .addon(QueryStringAddon)
    .auth(`Bearer ${accessToken}`)
    .query({
      channel: bot.channelId,
      include_locale: true,
    })
    .get('/conversations.info')
    .json(
      slackResponseBody({
        channel: z.object({
          locale: z.string(),
        }),
      }).parse
    )
    .then((response) => {
      if (!response.ok) {
        if (response.error === 'channel_not_found') {
          throw new SlackError('Slack Channel is Private', {
            code: response.error,
          });
        }

        throw new SlackError('Failed to get Channel info', {
          code: response.error,
        });
      }

      return response;
    });

  return {
    id: bot.id,
    teamId,
    userId,
    locale: channel.locale,
    schedule,
    webhookUrl: bot.webhookUrl,
  };
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
  // todo
  const baseUrl = getEnvironmentVariable(c, 'BASE_URL');
  const redirectUrl = `${baseUrl}/register`;

  const registrationData = await slackClient
    .addon(FormUrlAddon)
    .auth(`Basic ${getSlackAuthToken(c)}`)
    .formUrl({
      code,
      redirect_uri: redirectUrl,
    })
    .post('', '/oauth.v2.access')
    .json(
      slackResponseBody({
        bot_user_id: z.string(),
        app_id: z.string(),
        scope: z.string(),
        access_token: z.string(),
        team: z.object({
          id: z.string(),
        }),
        incoming_webhook: z.object({
          channel_id: z.string(),
          url: z.string(),
        }),
      }).parse
    )
    .then((response) => {
      if (!response.ok) {
        throw new SlackError('Registration Failed', {
          code: response.error,
        });
      }
      return response;
    });

  const appId = registrationData.app_id;
  const botId = generatBotId(registrationData.team.id);

  const db = getDb(c);

  const botData = {
    updatedAt: new Date(),
    channelId: registrationData.incoming_webhook.channel_id,
    scope: registrationData.scope,
    accessToken: Buffer.from(encryptString(registrationData.access_token)),
    webhookUrl: registrationData.incoming_webhook.url,
  };

  const result = await db
    .insert(Bot)
    .values({
      id: botId,
      appId: registrationData.app_id,
      createdAt: botData.updatedAt,
      ...botData,
    })
    .onConflictDoUpdate({
      target: Bot.id,
      set: {
        ...botData,
      },
      setWhere: eq(Bot.appId, appId),
    });

  if (result.rowsAffected !== 1) {
    throw new Error('Unable to upsert bot', { cause: result });
  }

};

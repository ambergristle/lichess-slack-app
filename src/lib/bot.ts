import { and, eq } from 'drizzle-orm';
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
export const generatBotId = (channelId: string): string => {
  const hashedTokenBytes = sha256(new TextEncoder().encode(channelId));
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

export const getBotContext = async (
  c: Context,
  channelId: string,
  userId: string
) => {

  const botId = generatBotId(channelId);
  const scheduleId = generateScheduleId(botId, userId);

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

  const accessToken = await getBotAccessToken(c, botId);
  // https://api.slack.com/methods/conversations.info
  const { channel } = await slackClient
    .addon(QueryStringAddon)
    .auth(`Bearer ${accessToken}`)
    .query({
      channel: channelId,
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
    id: botId,
    userId,
    locale: channel.locale,
    schedule: result.schedule,
    webhookUrl: result.webhookUrl,
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


  const channelId = registrationData.incoming_webhook.channel_id;
  const botId = generatBotId(registrationData.incoming_webhook.channel_id);
  const now = new Date();

  const db = getDb(c);
  const result = await db
    .insert(Bot)
    .values({
      id: botId,
      createdAt: now,
      updatedAt: now,
      channelId,
      scope: registrationData.scope,
      accessToken: Buffer.from(encryptString(registrationData.access_token)),
      webhookUrl: registrationData.incoming_webhook.url,
    });

  if (result.rowsAffected !== 1) {
    throw new Error('Unable to upsert bot', { cause: result });
  }

};

import { and, eq, ne, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';
import wretch from 'wretch';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';
import { z } from 'zod';

import { type CronTime, stringifyCron, zonedToUtc } from './cron';
import { getDb } from './db';
import { Bot } from './db/schema';
import { getEnvironmentVariable } from './request';
import { decryptToString, encryptString } from './encryption';
import { SlackError, getUserTimeZone, slackClient, slackResponseBody } from './slack';


/**
 * Hash token bytes using SHA-256, and return with base-32 encoding
 * @param token Created by {@linkcode generateAuthSessionToken}
 */
export const generatBotId = (teamId: string): string => {
  const hashedTokenBytes = sha256(new TextEncoder().encode(teamId));
  return encodeBase32LowerCaseNoPadding(hashedTokenBytes);
};

const getSlackAuthToken = (c: Context) => {
  const clientId = getEnvironmentVariable(c, 'SLACK_CLIENT_ID');
  const secret = getEnvironmentVariable(c, 'SLACK_CLIENT_SECRET');

  return btoa(`${clientId}:${secret}`);
};


type BotData = Pick<typeof Bot.$inferSelect,
| 'appId'
| 'channelId'
| 'webhookUrl'
| 'jobId'
| 'cron'
| 'timeZone'
>

/**
 *
 * QStash API Client
 *
 */

const qStash = wretch('https://qstash.upstash.io/v2');

const getBotSchedule = (botData: BotData) => {
  if (!botData.jobId) {
    return;
  }

  if (!botData.cron || !botData.timeZone) {
    throw new Error('Scheduled bot missing job ID or cron');
  }

  return {
    jobId: botData.jobId,
    cron: botData.cron,
    timeZone: botData.timeZone,
  };
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
    throw new HTTPException(401, {
      message: 'Unauthorized',
      cause: { botId },
    });
  }

  return decryptToString(bot.accessToken);
};

export const getBotContext = async (c: Context, teamId: string) => {
  const botId = generatBotId(teamId);

  const db = getDb(c);
  const [bot] = await db
    .select({
      id: Bot.id,
      appId: Bot.appId,
      channelId: Bot.channelId,
      webhookUrl: Bot.webhookUrl,
      jobId: Bot.jobId,
      cron: Bot.cron,
      timeZone: Bot.timeZone,
    })
    .from(Bot)
    .where(eq(Bot.id, botId))
    .limit(1);

  if (!bot) {
    throw new HTTPException(401, {
      message: 'Unauthorized',
      cause: { botId, teamId },
    });
  }

  const botSchedule = getBotSchedule(bot);
  const accessToken = await getBotAccessToken(c, botId);

  // https://api.slack.com/methods/conversations.info
  const { channel } = await slackClient
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
    locale: channel.locale,
    timezone: bot.timeZone,
    schedule: botSchedule,
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
    throw new HTTPException(404, {
      message: 'Bot Not Found',
      cause: {
        botId,
      },
    });
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

  const now = new Date();
  const botData = {
    updatedAt: now,
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
      createdAt: now,
      ...botData,
    })
    .onConflictDoUpdate({
      target: Bot.id,
      set: {
        ...botData,
      },
      setWhere: and(
        eq(Bot.appId, appId)
      ),
    });

  if (result.rowsAffected !== 1) {
    throw new Error('Unable to upsert bot', { cause: result });
  }

};

const ZCreateScheduleResponse = z.object({
  scheduleId: z.string(),
}, {
  message: 'Recieved invalid response',
});

export const setBotSchedule = async (
  c: Context,
  teamId: string,
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
  const botId = generatBotId(teamId);

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

  /** @todo db retry or session */
  const db = getDb(c);
  await db
    .update(Bot)
    .set({
      updatedAt: new Date(),
      jobId,
      cron,
      timeZone,
    })
    .where(eq(Bot.id, botId));

  if (currentScheduleId) {
    await qStash
      .auth(`Bearer ${authToken}`)
      .delete(`/schedules/${currentScheduleId}`)
      .res();
  }

  return {
    utcCronTime: cronTime,
    timeZone,
  };
};

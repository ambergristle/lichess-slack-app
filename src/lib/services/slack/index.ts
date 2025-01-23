import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import QueryStringAddon from 'wretch/addons/queryString';
import FormUrlAddon from 'wretch/addons/formUrl';
import wretch from 'wretch';
import { z } from 'zod';

import { getBotAccessToken } from '@/lib/entities/bot';
import { generateState } from '@/lib/utils/auth';
import { KnownError } from '@/lib/utils/errors';
import { getEnvironmentVariable, getIsProduction } from '@/lib/utils/request';
import { APP_SCOPE, OAUTH_STATE_COOKIE_NAME } from './config';

export { blocks } from './blocks';


/** Slack API HTTP Client */
export const slackClient = wretch('https://slack.com/api');


/**
 * Generate a Basic auth token using the Slack
 * Client ID and Secret environment variables
 */
export const getSlackAuthToken = (c: Context) => {
  const clientId = getEnvironmentVariable(c, 'SLACK_CLIENT_ID');
  const clientSecret = getEnvironmentVariable(c, 'SLACK_CLIENT_SECRET');

  return btoa(`${clientId}:${clientSecret}`);
};


export const completeRegistration = async (c: Context, code: string) => {
  // todo
  const baseUrl = getEnvironmentVariable(c, 'BASE_URL');
  const redirectUrl = `${baseUrl}/register`;

  const response = await slackClient
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
    );

  if (!response.ok) {
    throw new SlackError('Registration Failed', {
      code: response.error,
    });
  }

  return {
    channelId: response.incoming_webhook.channel_id,
    scope: response.scope,
    accessToken: response.access_token,
    webhookUrl: response.incoming_webhook.url,
  };
};


export const getChannelLocale = async (
  c: Context,
  botId: string,
  channelId: string
) => {
  const accessToken = await getBotAccessToken(c, botId);

  // https://api.slack.com/methods/conversations.info
  const response = await slackClient
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
    );

  if (!response.ok) {
    if (response.error === 'channel_not_found') {
      throw new KnownError('Slack Channel is Private', {
        cause: response,
      });
    }

    throw new KnownError('Failed to get Channel info', {
      cause: response,
    });
  }

  return response.channel.locale;
};


export const getUserTimeZone = async (
  c: Context,
  botId: string,
  userId: string
) => {
  const accessToken = await getBotAccessToken(c, botId);

  // https://api.slack.com/methods/users.info
  const response = await slackClient
    .addon(QueryStringAddon)
    .auth(`Bearer ${accessToken}`)
    .query({
      user: userId,
      include_locale: true,
    })
    .get('/users.info')
    .json(
      slackResponseBody({
        user: z.object({
          tz: z.string(),
        }),
      }).parse
    );

  if (!response.ok) {
    throw new SlackError('Failed to get User info', {
      code: response.error,
    });
  }

  return response.user.tz;
};


/**
 * Generate a link that begins process of registering bot
 * to user's Slack workspace.
 * @note The redirect url should point to the registration webhook handler
 * @see https://api.slack.com/authentication/oauth-v2#asking
 */
export const generateOAuthRedirectUrl = (c: Context) => {
  const baseUrl = getEnvironmentVariable(c, 'BASE_URL');

  const state = generateState();
  const searchParams = new URLSearchParams({
    client_id: getEnvironmentVariable(c, 'SLACK_CLIENT_ID'),
    scope: APP_SCOPE,
    state,
    redirect_uri: `${baseUrl}/register`,
  });

  setCookie(c, OAUTH_STATE_COOKIE_NAME, state, {
    path: '/',
    secure: getIsProduction(c),
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'lax',
  });

  return `https://slack.com/oauth/v2/authorize?${searchParams.toString()}`;
};


export const slackResponseBody = <S extends z.ZodRawShape>(shape: S) => {
  return z.union([
    z.object({
      ok: z.literal(false),
      error: z.string(),
    }),
    z.object({
      ok: z.literal(true),
    }).extend(shape),
  ]);
};


interface SlackErrorOptions extends ErrorOptions {
  code: string;
}

export class SlackError extends Error {
  public readonly code;

  constructor(message: string, { code, ...options }: SlackErrorOptions) {
    super(message, options);

    this.name = 'SlackError';
    this.code = code;
  }
}

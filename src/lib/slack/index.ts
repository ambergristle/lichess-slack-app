import type { Context, Env, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { ActionsBlock, KnownBlock, PlainTextOption, SectionBlock } from '@slack/web-api';

import { getBotAccessToken } from '@/lib/db/queries/bot';
import { hmac } from '@/lib/utils/hmac';
import { AuthorizationError, KnownError } from '@/lib/utils/errors';
import { secret } from '@/lib/utils/env';
import { SUPPORTED_TIME_ZONES } from '@/locale/time-zones';
import { createMiddleware } from 'hono/factory';
import { zOAuthAccessResponseBody } from '@/lib/dtos/slack';
import type { DB } from '../db';
import { encodeBase64urlNoPadding } from '@oslojs/encoding';
import config from '@/config';

// #region Config

/**
 * The scopes required by the app, requested on registration.
 */
export const APP_SCOPE = ['commands', 'incoming-webhook', 'channels:read', 'users:read'].join(',');

/**
 * @deprecated Keeping this around in case manual timezone
 * configuration comes back into play
 */
export const TIME_ZONE_OPTIONS = SUPPORTED_TIME_ZONES.map(
  (timeZone): PlainTextOption => ({
    text: {
      type: 'plain_text',
      text: timeZone,
    },
    value: timeZone,
  }),
);

// #endregion

// #region Responses

/**
 * Factories for creating common Slack blocks
 * @see https://api.slack.com/block-kit
 * @see https://api.slack.com/interactivity/slash-commands
 */
export const blocks = {
  actions: (elements: ActionsBlock['elements']) => {
    return {
      type: 'actions',
      elements,
    };
  },
  divider: () => {
    return {
      type: 'divider',
    };
  },
  image: (props: { title: string; href: string; alt: string }) => {
    return {
      type: 'image',
      title: {
        type: 'plain_text',
        text: props.title,
      },
      image_url: props.href,
      alt_text: props.alt,
    };
  },
  section: (props: { text: string; accessory?: SectionBlock['accessory'] }) => {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: props.text,
      },
      accessory: props.accessory,
    };
  },
  // Only return type is being enforced, args are unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<string, (...args: any[]) => KnownBlock>;

// #endregion

const SLACK_BASE_URL = 'https://slack.com/api';

// #region Fetch Preferences

/**
 * @see https://api.slack.com/methods/conversations.info
 * @param c
 * @param botId
 * @param channelId
 * @returns
 */
export const getBotContext = async (db: DB, channelId: string) => {
  const queryParams = new URLSearchParams({
    channel: channelId,
    include_locale: 'true',
  }).toString();

  const { botId, accessToken } = await getBotAccessToken(db, { channelId });
  const response = await fetch(
    `${SLACK_BASE_URL}/conversations.info` + '?' + queryParams,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if ((await response.text()) === 'channel_not_found') {
      throw new KnownError('Slack Channel is Private', {
        cause: response,
      });
    }

    throw new KnownError('Failed to get Channel info', {
      cause: response,
    });
  }

  const json = await response.json();
  const { channel } = z
    .object({
      channel: z.object({
        locale: z.string(),
      }),
    })
    .parse(json);

  return {
    botId,
    locale: channel.locale,
  };
};

/**
 * @see https://api.slack.com/methods/users.info
 * @param c
 * @param botId
 * @param userId
 * @returns
 */
export const getUserTimeZone = async <V extends { db: DB }>(
  c: Context<{ Variables: V }>,
  botId: string,
  userId: string,
) => {
  const queryParams = new URLSearchParams({
    user: userId,
    include_locale: 'true',
  }).toString();

  const { accessToken } = await getBotAccessToken(c.var.db, { botId });
  const response = await fetch(
    `${SLACK_BASE_URL}/users.info` + '?' + queryParams, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SlackError('Failed to get User info', {
      code: await response.text(),
    });
  }

  const json = await response.json();
  const { user } = z
    .object({
      user: z.object({
        tz: z.string(),
      }),
    })
    .parse(json);

  return user.tz;
};

// #endregion

// #region Registration

/**
 * Exchange auth code for access token
 * @see https://api.slack.com/methods/oauth.v2.access
 */
export const exchangeCodeGrant = async (code: string) => {
  const clientSecret = secret('SLACK_CLIENT_SECRET');
  const response = await fetch(`${SLACK_BASE_URL}/oauth.v2.access`, {
    method: 'POST',
    body: new URLSearchParams({
      code,
      redirect_uri: `${config.baseUrl}/register`,
    }),
    headers: {
      authorization: `Basic ${btoa(`${config.slack.clientId}:${clientSecret}`)}`,
    },
  });

  if (!response.ok) {
    throw new Error('Request failed unexpectedly', { cause: response });
  }

  const json = await response.json();
  const result = zOAuthAccessResponseBody.parse(json);

  if (!result.ok) {
    throw new SlackError('Registration Failed', {
      code: result.error,
    });
  }

  const { app_id, bot_user_id, incoming_webhook, scope, access_token } = result;

  if (app_id !== config.slack.appId) {
    throw new Error('Invalid Slack app ID', { cause: { app_id } });
  }

  return {
    botUserId: bot_user_id,
    channelId: incoming_webhook.channel_id,
    scope: scope,
    accessToken: access_token,
    webhookUrl: incoming_webhook.url,
  };
};

const OAUTH_STATE_COOKIE_NAME = 'lsa_auth_state';

/**
 * Generate a link that begins process of registering bot
 * to user's Slack workspace.
 * @note The redirect url should point to the registration webhook handler
 * @see https://api.slack.com/authentication/oauth-v2#asking
 * @param c Context is used to set `state` cookie
 */
export const generateAuthorizationUrl = (c: Context): string => {
  // Generate random state to mitigate CSRF attacks.
  // Could also encode + hash auth request data.
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  const state = encodeBase64urlNoPadding(buffer);

  const queryParams = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: APP_SCOPE,
    state,
    redirect_uri: `${config.baseUrl}/register`,
  }).toString();

  setCookie(c, OAUTH_STATE_COOKIE_NAME, state, {
    path: '/',
    secure: config.environment === 'production',
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'lax',
  });

  return new URL(`https://slack.com/oauth/v2/authorize?${queryParams}`).toString();
};

/**
 *
 * @see (generateAuthorizationUrl)
 */
export const validateRegistrationRequest = <E extends Env = Env>() => {
  return createMiddleware<E, '/register', { out: { query: { code: string } } }>(
    async (c: Context, next: Next) => {
      const { code, state } = c.req.query();

      if (!code || typeof code !== 'string') {
        throw new AuthorizationError('Invalid authorization code');
      }

      if (!state || typeof state !== 'string') {
        throw new AuthorizationError('Invalid authorization code state');
      }

      const stateCookie = getCookie(c, OAUTH_STATE_COOKIE_NAME);
      if (state !== stateCookie) {
        throw new AuthorizationError('Invalid authorization code state');
      }

      await next();
    },
  );
};

// #endregion

// #region Auth

const unixMilliseconds = (timestamp: string) => {
  const epochSeconds = Number(timestamp);
  if (isNaN(epochSeconds)) throw new Error('Invalid timestamp');
  return epochSeconds * 1000;
};

// const toUnix = (date: Date) => {
//   return `${Math.floor(date.valueOf() / 1000)}`;
// };

/**
 * Protect against replay attacks by requiring that timestamps
 * differ from local (server) time by no more than 5 minutes
 * @param timestamp Unix timestamp
 */
const validateTimestamp = (timestamp: string) => {
  const millisecondDifference = Date.now() - unixMilliseconds(timestamp);
  if (millisecondDifference < 0) return false;
  if (millisecondDifference > 1000 * 60 * 5) return false;

  return true;
};

/**
 *
 * @see https://api.slack.com/interactivity/slash-commands#responding_to_commands
 */
export const verifySlackSignature = () => {
  return createMiddleware(async (c, next) => {
    const {
      'user-agent': userAgent,
      'x-slack-signature': signature,
      'x-slack-request-timestamp': timestamp,
    } = c.req.header();

    const isFromSlackbot = !!userAgent?.includes('Slackbot 1.0 (+https://api.slack.com/robots)');

    const body = await c.req.text();
    const signatureData = `v0:${timestamp}:${body}`;

    const expectedSignature = hmac.createDigest(
      secret('SLACK_SIGNING_SECRET'),
      signatureData,
      'hex',
    );

    const timestampIsValid = validateTimestamp(`${timestamp}`);
    const signatureIsValid = hmac.compareDigests(`v0=${expectedSignature}`, `${signature}`);

    // Obscure implementation details by throwing
    // after both validations have resolved
    if (!isFromSlackbot) {
      throw new AuthorizationError('Invalid User Agent');
    }

    if (!signature || !timestamp) {
      throw new AuthorizationError('Request Unsigned');
    }

    if (!timestampIsValid) {
      throw new AuthorizationError('Invalid Timestamp', {
        cause: { userAgent, signature, timestamp },
      });
    }

    if (!signatureIsValid) {
      throw new AuthorizationError('Invalid Signature');
    }

    await next();
  });
};

// #endregion

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

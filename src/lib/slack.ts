import type { Context } from 'hono';
import type { KnownBlock, PlainTextOption, SectionBlock } from '@slack/web-api';
import wretch from 'wretch';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';

import hmac from './hmac';
import { getEnvironmentVariable } from './request';
import { unixMilliseconds } from './dates';
import { z } from 'zod';
import { CronTime } from './cron';
import { Accessory } from '@slack/web-api/dist/response/ChannelsInfoResponse';
import { SUPPORTED_TIME_ZONES } from '@/locale/time-zones';
import { getBotAccessToken } from './bot';


/**
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 * @see https://api.slack.com/block-kit
 */
export const blocks = {
  divider: () => {
    return {
      type: 'divider',
    };
  },
  image: (props: { title: string; href: string; alt: string; }) => {
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
  // eslint-disable-next-line
} satisfies Record<string, ((...args: any[]) => KnownBlock)>;

export const TIME_ZONE_OPTIONS = SUPPORTED_TIME_ZONES
  .map((timeZone): PlainTextOption => ({
    text: {
      type: 'plain_text',
      text: timeZone,
    },
    value: timeZone,
  }));

const APP_SCOPES = [
  'commands',
  'incoming-webhook',
  'channels:read',
  'users:read',
];

const APP_SCOPE = APP_SCOPES.join(',');

/**
 * Generate a link that begins process of registering bot
 * to user's Slack workspace.
 * @note The redirect url should point to the registration webhook handler
 * @see https://api.slack.com/authentication/oauth-v2#asking
 */
export const generateOAuthRedirectUrl = (c: Context) => {
  const baseUrl = getEnvironmentVariable(c, 'BASE_URL');

  const searchParams = new URLSearchParams({
    client_id: getEnvironmentVariable(c, 'SLACK_CLIENT_ID'),
    scope: APP_SCOPE,
    state: getEnvironmentVariable(c, 'STATE'),
    redirect_uri: `${baseUrl}/register`,
  });

  return `https://slack.com/oauth/v2/authorize?${searchParams.toString()}`;
};


/**
 * Protect against replay attacks by requiring that timestamps
 * differ from local (server) time by no more than 5 minutes
 * @param timestamp Unix timestamp
 * @returns boolean
 */
const validateTimestamp = (timestamp: string) => {
  const millisecondDifference = Date.now() - unixMilliseconds(timestamp);
  if (millisecondDifference < 0) return false;
  if (millisecondDifference > 1000 * 60 * 5) return false;

  return true;
};

/**
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 * @param c
 * @param body
 * @param signature
 * @param timestamp
 * @returns
 */
export const verifySignature = (c: Context, body: string, signature: string, timestamp: string) => {
  const signatureData = `v0:${timestamp}:${body}`;

  const expectedSignature = hmac.createDigest(
    getEnvironmentVariable(c, 'SLACK_SIGNING_SECRET'),
    signatureData,
    'hex'
  );

  const timestampIsValid = validateTimestamp(timestamp);
  const signatureIsValid = hmac.compareDigests(
    `v0=${expectedSignature}`,
    signature
  );

  return {
    timestampIsValid,
    signatureIsValid,
  };
};

/**
 * Slack API Client
 *
 */

export const slackClient = wretch('https://slack.com/api')
  .addon(QueryStringAddon);

export const getUserTimeZone = async (c: Context, botId: string, userId: string) => {
  const accessToken = await getBotAccessToken(c, botId);

  const response = await slackClient
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

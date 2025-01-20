import { Context } from 'hono';
import type { KnownBlock } from '@slack/web-api';

import hmac from './hmac';
import { getEnvironmentVariable } from './request';
import { unixMilliseconds } from './dates';
import { z } from 'zod';
import { CronTime } from './cron';


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
  section: (props: { text: string; }) => {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: props.text,
      },
    };
  },
  // eslint-disable-next-line
} satisfies Record<string, ((...args: any[]) => KnownBlock)>;

export const formatTimeInput = ({ hour, minute }: CronTime) => {
  const hh = padDigits(hour);
  const mm = padDigits(minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000Z`;

  return new Date(dateTimeString).toLocaleTimeString(['en-US'], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
};




const APP_SCOPES = [
  'commands',
  'incoming-webhook',
  'channels:read',
];

const APP_SCOPE = APP_SCOPES.join(',');

/**
 * Generate a link that begins process of registering bot
 * to user's Slack workspace.
 * @note The redirect url should point to the registration webhook handler
 * @see https://api.slack.com/authentication/oauth-v2#asking
 */
export const generateOAuthRedirectUrl = (c: Context) => {
  const searchParams = new URLSearchParams({
    client_id: getEnvironmentVariable(c, 'SLACK_CLIENT_ID'),
    scope: APP_SCOPE,
    state: getEnvironmentVariable(c, 'STATE'),
    redirect_uri: getEnvironmentVariable(c, 'REGISTRATION_URL'),
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

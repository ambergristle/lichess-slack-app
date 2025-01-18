import { z } from 'zod';

import config from '@/config';

const APP_SCOPES = [
  'commands',
  'incoming-webhook',
  'users:read',
];

export const APP_SCOPE = APP_SCOPES.join(',');

export const ZRegistrationRequest = z.object({
  code: z.string(),
  state: z.literal(config.STATE),
}, { message: 'Recieved unprocessable request' });

/**
 * @see https://api.slack.com/methods/oauth.v2.access
 */
export const ZRegistrationResponse = z.object({
  bot_user_id: z.string(),
  access_token: z.string(),
  scope: z.literal(APP_SCOPE), // todo; this is funky
  team: z.object({
    id: z.string(),
  }),
  incoming_webhook: z.object({
    channel_id: z.string(),
    url: z.string(),
  }),
});


/**
 * @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export const ZSlashCommandRequest = z.object({
  team_id: z.string(),
  channel_id: z.string(),
  user_id: z.string(),
  command: z.string(),
  text: z.string(),
  token: z.string(),
  api_app_id: z.string(),
  response_url: z.string(),
}, {
  message: 'Recieved unprocessable request',
}).transform((body) => ({
  teamId: body.team_id,
  channelId: body.channel_id,
  userId: body.user_id,
  command: body.command,
  text: body.text,
  token: body.token,
  apiAppId: body.api_app_id,
  responseUrl: body.response_url,
}));

// todo: this is nuts

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 */
export const ZTimePickerActionRequest = z.preprocess(
  (data) => {
    const { payload } = z.object({
      payload: z.string()
        .transform((data) => JSON.parse(data)),
    }).parse(data);

    return payload;
  },
  z.object({
    team: z.object({
      id: z.string(),
    }),
    user: z.object({
      id: z.string(),
    }),
    token: z.string(),
    response_url: z.string(),
    actions: z.object({
      action_id: z.string(),
      block_id: z.string(),
      selected_time: z.string()
        .trim()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .transform((selectedTime) => {
          const [ hour, minute ] = selectedTime.split(':')
          return { hour, minute }
        }),
    }).array().min(1),
  }, {
    message: 'Recieved unprocessable request',
  }),
)

/** @see https://api.slack.com/types/user */
export const ZUserInfoResponse = z.object({
  user: z.object({
    tz: z.string(),
    tz_label: z.string(),
    tz_offset: z.number(),
    locale: z.string(),
  }),
}, {
  message: 'Recieved unprocessable response from Slack API',
}).transform(({ user }) => ({
  tz: user.tz,
  tzLabel: user.tz_label,
  tzOffset: user.tz_offset,
  locale: user.locale,
}));

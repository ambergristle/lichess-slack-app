import { z } from 'zod';

import { RegistrationData, TriggerRegistrationRequest, SlashCommandData, TimePickerData, UserInfo } from './types';

export const parseHeaders = (headers: Headers) => {
  return z.object({
    'x-slack-signature': z.string(),
    'x-slack-request-timestamp': z.string(), // date string?
  }).transform((headers) => ({
    signature: headers['x-slack-signature'],
    timestamp: headers['x-slack-request-timestamp'],
  })).parse(headers);
};

export const parseRegistrationRequest = (body: unknown, state: string): TriggerRegistrationRequest => {
  return z.object({
    code: z.string(),
    state: z.literal(state),
  }).parse(body);
};

export const parseBotCredentialResponse = (body: unknown): RegistrationData => {
  const data = z.object({
    bot_user_id: z.string(),
    access_token: z.string(),
    scope: z.string(),
    team: z.object({
      id: z.string(),
    }),
  }).parse(body)

  return {
    uid: data.bot_user_id,
    token: data.access_token,
    scope: data.scope.split(','),
    teamId: data.team.id,
  }
};

/**
 * @param body Json representation of slash command payload
 * @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export const parseSlashCommandRequest = (body: unknown): SlashCommandData => {
  const data = z.object({
    team_id: z.string(),
    channel_id: z.string(),
    user_id: z.string(),
    command: z.string(),
    text: z.string(),
    token: z.string(),
    api_app_id: z.string(),
    response_url: z.string(),
  }).parse(body)

  return {
    teamId: data.team_id,
    channelId: data.channel_id,
    userId: data.user_id,
    command: data.command,
    text: data.text,
    token: data.token,
    appId: data.api_app_id,
    responseUrl: data.response_url,
  }
};

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 */
export const parseTimePickerAction = (body: unknown): TimePickerData => {
  const { payload } = z.object({
    payload: z.string()
      .transform((data) => JSON.parse(data))
  }).parse(body)

  const data = z.object({
    team: z.object({
      id: z.string()
    }),
    user: z.object({ 
      id: z.string(),
    }),
    actions: z.object({
      action_id: z.string(),
      block_id: z.string(),
      selected_time: z.string()
    }).array().min(1),
    response_url: z.string(),
  }).parse(payload)

  return {
    teamId: data.team.id,
    userId: data.user.id,
    selectedTime: data.actions[0]?.selected_time,
    responseUrl: data.response_url,
  }
}
// locale is conditional
export const parseTimeZone = (body: unknown): UserInfo => {
  const { user } = z.object({
    user: z.object({
      tz: z.string(),
      tz_label: z.string(),
      tz_offset: z.number(),
      locale: z.string(),
    })
  }).parse(body)

  return {
    tz: user.tz,
    tzLabel: user.tz_label,
    tzOffset: user.tz_offset,
    locale: user.locale,
  }
}

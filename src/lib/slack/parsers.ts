import { z } from 'zod';

import { Parser, parserFactory } from '@/lib/utils';
import {
  RegistrationData,
  SlashCommandData,
  TimePickerData,
  UserInfo,
  UserInfoResponse,
  RegistrationRequest,
  SlashCommandRequest,
  TimePickerActionRequest,
  RegistrationResponse,
  AuthenticationHeaders,
  SlackSignature,
} from './types';
import config from '@/config';
import { ValidationError } from '../errors';

const ZAuthenticationHeaders = z.object({
  'x-slack-signature': z.string(),
  'x-slack-request-timestamp': z.string(), // date string?
});

const parseRequestHeaders: Parser<AuthenticationHeaders> = parserFactory(
  ZAuthenticationHeaders,
  {
    entityName: 'AuthenticationHeaders',
    errorMessage: 'Recieved invalid request headers',
  },
);

export const parseSignature: Parser<SlackSignature> = (data) => {
  const headers = parseRequestHeaders(data);

  return {
    signature: headers['x-slack-signature'],
    timestamp: headers['x-slack-request-timestamp'],
  };
};

const ZRegistrationRequest = z.object({
  code: z.string(),
  state: z.literal(config.STATE),
});

export const parseRegistrationRequest: Parser<RegistrationRequest> = parserFactory(
  ZRegistrationRequest,
  {
    entityName: 'RegistrationRequest',
    errorMessage: 'Recieved unprocessable request',
  },
);

/**
 * Scope-dependent
 * @see https://api.slack.com/methods/oauth.v2.access
 */
const ZRegistrationResponse = z.object({
  bot_user_id: z.string(),
  access_token: z.string(),
  scope: z.string(),
  team: z.object({
    id: z.string(),
  }),
  incoming_webhook: z.object({
    channel_id: z.string(),
    url: z.string(),
  }),
});

const parseRegistrationResponse: Parser<RegistrationResponse> = parserFactory(
  ZRegistrationResponse,
  {
    entityName: 'RegistrationResponse',
    errorMessage: 'Recieved unprocessable response from Slack API',
  },
);

export const parseRegistrationData: Parser<RegistrationData> = (data) => {
  const response = parseRegistrationResponse(data);

  return {
    uid: response.bot_user_id,
    token: response.access_token,
    scope: response.scope.split(','),
    teamId: response.team.id,
    channelId: response.incoming_webhook.channel_id,
    webhookUrl: response.incoming_webhook.url,
  };
};

const ZSlashCommandRequest = z.object({
  team_id: z.string(),
  channel_id: z.string(),
  user_id: z.string(),
  command: z.string(),
  text: z.string(),
  token: z.string(),
  api_app_id: z.string(),
  response_url: z.string(),
});

const parseSlashCommandRequest: Parser<SlashCommandRequest> = parserFactory(
  ZSlashCommandRequest,
  {
    entityName: 'SlashCommandRequest',
    errorMessage: 'Recieved unprocessable request',
  },
);

export const parseSlashCommandData: Parser<SlashCommandData> = (data) => {
  const request = parseSlashCommandRequest(data);

  return {
    teamId: request.team_id,
    channelId: request.channel_id,
    userId: request.user_id,
    command: request.command,
    text: request.text,
    token: request.token,
    appId: request.api_app_id,
    responseUrl: request.response_url,
  };
};

const ZTimePickerActionRequest = z.preprocess(
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
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }).array().min(1),
  }),
);

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 * This isn't that helpful actually; I couldn't find the original reference
 */
const parseTimePickerActionRequest: Parser<TimePickerActionRequest> = parserFactory(
  ZTimePickerActionRequest,
  {
    entityName: 'TimePickerActionRequest',
    errorMessage: 'Recieved unprocessable request',
  },
);

export const parseTimePickerData: Parser<TimePickerData> = (data) => {
  const request = parseTimePickerActionRequest(data);

  const selectedTime = request.actions[0]?.selected_time;
  if (!selectedTime) throw new ValidationError('No time selected', { 
    entityName: 'TimePickerActionRequest',
    errors: [{ 
      path: 'actions.selected_time', 
      message: 'Required',
    }],
  });

  const [hours, minutes] = selectedTime.split(':');

  return {
    teamId: request.team.id,
    userId: request.user.id,
    token: request.token,
    selectedTime: { 
      hour: Number(hours), 
      minute: Number(minutes),
    },
    responseUrl: request.response_url,
  };
};

const ZUserInfoResponse = z.object({
  user: z.object({
    tz: z.string(),
    tz_label: z.string(),
    tz_offset: z.number(),
    locale: z.string(),
  }),
});

const parseUserInfoResponse: Parser<UserInfoResponse> = parserFactory(
  ZUserInfoResponse,
  {
    entityName: 'UserInfoResponse',
    errorMessage: 'Recieved unprocessable response from Slack API',
  },
);

/** 
 * @note Locale is only included if specified in request search params 
 */
export const parseUserInfo: Parser<UserInfo> = (data) => {
  const { user } = parseUserInfoResponse(data);

  return {
    tz: user.tz,
    tzLabel: user.tz_label,
    tzOffset: user.tz_offset,
    locale: user.locale,
  };
};

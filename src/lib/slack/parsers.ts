import { z } from 'zod';

export const parseHeaders = (headers: Headers) => {
  return z.object({
    'x-slack-signature': z.string(),
    'x-slack-request-timestamp': z.string(), // date string?
  }).transform((headers) => ({
    signature: headers['x-slack-signature'],
    timestamp: headers['x-slack-request-timestamp'],
  })).parse(headers);
};

export const parseRegistrationRequest = (body: unknown, state: string) => {
  return z.object({
    code: z.string(),
    state: z.literal(state),
  }).parse(body);
};

export const parseBotCredentialResponse = (body: unknown) => {
  return z.object({
    bot_user_id: z.string(),
    access_token: z.string(),
    scope: z.string(),
    team: z.object({
      id: z.string(),
    }),
  }).transform((parsed) => ({
    uid: parsed.bot_user_id,
    token: parsed.access_token,
    scope: parsed.scope.split(','),
    teamId: parsed.team.id,
  })).parse(body);
};

/**
 * @param body Json representation of slash command payload
 * @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export const parseSlashCommandRequest = (body: unknown) => {
  return z.object({
    team_id: z.string(),
    channel_id: z.string(),
    user_id: z.string(),
    command: z.string(),
    text: z.string(),
    token: z.string(),
    api_app_id: z.string(),
    response_url: z.string(),
  }).transform((parsed) => ({
    teamId: parsed.team_id,
    channelId: parsed.channel_id,
    userId: parsed.user_id,
    command: parsed.command,
    text: parsed.text,
    parsedoke: parsed.token,
    appId: parsed.api_app_id,
    responseUrl: parsed.response_url,
  })).parse(body);
};
import { z } from 'zod';
import { ZString } from 'schemas/primitive';
import type { KnownBlock } from '@slack/web-api';

export enum SlashCommand {
  Help = 'help',
  Puzzle = 'puzzle',
  SetTime = 'set-time',
}

export const ZTokenRequest = z.object({
  client_id: ZString,
  client_secret: ZString,
  code: ZString,
});

export const ZPostMessageRequest = z.object({
  channel: ZString,
  text: z.string().optional(),
});



export interface ICommandTextResponse {
    response_type: 'in_channel';
    text: string;
}

export interface ICommandBlockResponse extends ICommandTextResponse {
    blocks: KnownBlock[];
}


/**
 * Incoming request body
 * @warning Content-type = application/x-www-form-urlencoded
 * @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export const ZSlashCommand = z.object({
  // context ids
  user_id: z.string(),
  user_name: z.string(),
  channel_id: z.string(),
  channel_name: z.string(),
  team_id: z.string(),
  team_domain: z.string(),
  enterprise_id: z.string().optional(),
  enterprise_name: z.string().optional(),
  // command data
  command: z.string(), // slash-prefixed
  text: z.string().optional(),
  // command metadata
  api_app_id: z.string(),
  trigger_id: z.string(),
  response_url: z.string().url(),
  // token: z.string(), deprecated
});

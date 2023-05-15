import { z } from 'zod';
import { ZString } from 'schemas/primitive';

/**
 * @see https://api.slack.com/interactivity/slash-commands
 */
export const ZIncomingSlashCommand = z.object({
  token: ZString,
  team_id: ZString,
  channel_id: ZString,
  command: ZString,
  text: z.string().optional(),
  response_url: ZString,
  trigger_id: ZString,
  api_app_id: ZString,
}).transform((body) => ({
  token: body.token,
  teamId: body.team_id,
  channelId: body.channel_id,
  command: body.command,
  text: body.text,
  responseUrl: body.response_url,
  triggerId: body.trigger_id,
  apiAppId: body.api_app_id,
}));

export type TIncomingSlashCommand = z.infer<typeof ZIncomingSlashCommand>;

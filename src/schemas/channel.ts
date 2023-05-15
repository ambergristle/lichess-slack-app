import { z } from 'zod';
import { ZDate, ZString } from './primitive';
import { documentSchemaFactory } from './document';

export const ZChannelData = z.object({
  teamId: ZString,
  channelId: ZString,
  webhookUrl: ZString.url(), // does this hold?
  puzzleScheduledAt: ZDate,
});

export type TChannelData = z.infer<typeof ZChannelData>;

export const ZChannel = documentSchemaFactory(ZChannelData);

export type TChannelSchema = typeof ZChannel
export type TChannel = z.infer<TChannelSchema>;

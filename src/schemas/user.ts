import { z } from 'zod';
import { ZDate, ZString } from './primitive';
import { documentSchemaFactory } from './document';

export const ZUserData = z.object({
  teamId: ZString,
  channelId: ZString,
  webhookUrl: ZString.url(), // does this hold?
  puzzleScheduledAt: ZDate,
});

export const ZUser = documentSchemaFactory(ZUserData);
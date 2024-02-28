import { z } from 'zod';

import { Parser, parserFactory } from '@/lib/utils';
import { Bot } from '@/types';

const ZSchedule = z.object({
  scheduleId: z.string(),
  cron: z.string(), // schema?
})

export const ZBot = z.object({
  uid: z.string(),
  teamId: z.string(),
  channelId: z.string(),
  token: z.string(),
  scope: z.string().array(),
  webhookUrl: z.string(),
  schedule: ZSchedule.optional()
})

export const parseBot: Parser<Bot> = parserFactory(
  ZBot,
  {
    entityName: 'Bot',
    errorMessage: 'Invalid Bot',
  },
);

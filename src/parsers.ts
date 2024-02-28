import { z } from 'zod';

import { Parser, parserFactory } from '@/lib/utils';
import { Bot } from '@/types';

const ZString = z.string().min(1)

const ZSchedule = z.object({
  scheduleId: ZString,
  cron: ZString, // schema?
})

export const ZBot = z.object({
  uid: ZString,
  teamId: ZString,
  token: ZString,
  scope: ZString.array(),
}).and(
  z.union([ZSchedule, z.object({})])
);

export const parseBot: Parser<Bot> = parserFactory(
  ZBot,
  {
    entityName: 'Bot',
    errorMessage: 'Invalid Bot',
  },
);

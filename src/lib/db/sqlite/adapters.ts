import { z } from 'zod';

import { Parser, parserFactory } from '@/lib/utils';
import { parseBot } from '@/parsers';
import type { Bot } from '@/types';
import { BotDocument } from './types';

const ZBotDocument = z.object({
  uid: z.string(),
  team_id: z.string(),
  token: z.string(),
  scope: z.string(),
  schedule_id: z.string().nullable(),
  cron: z.string().nullable(),
});

const parseBotData: Parser<BotDocument> = parserFactory(
  ZBotDocument,
  {
    entityName: 'BotDocument',
    errorMessage: 'Invalid BotDocument',
  },
);

export const sqliteToBot = (data: unknown): Bot => {

  const botData = parseBotData(data);

  const schedule = botData.schedule_id && botData.cron
    ? {
      scheduleId: botData.schedule_id,
      cron: botData.cron
    }
    : undefined

  return {
    uid: botData.uid,
    teamId: botData.team_id,
    token: botData.token,
    scope: botData.scope.split(','),
    ...schedule
  };
};

export const botToSqlite = (data: Bot): BotDocument => {
  const bot = parseBot(data);

  return parseBotData({
    uid: bot.uid,
    team_id: bot.teamId,
    token: bot.token,
    scope: bot.scope.join(','),
    schedule_id: bot.scheduleId ?? null,
    cron: bot.cron ?? null,
  });
};

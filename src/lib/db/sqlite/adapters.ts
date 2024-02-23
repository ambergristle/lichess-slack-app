import { z } from 'zod';

import { parserFactory } from '@/lib/utils';
import { parseBot } from '@/parsers';
import type { Bot } from '@/types';
import { BotDocument } from './types';

const ZBotDocument = z.object({
  uid: z.string(),
  team_id: z.string(),
  token: z.string(),
  scope: z.string(),
  scheduled_at: z.string().nullable(), // time string; optional?
});

const parseBotData = parserFactory(
  ZBotDocument,
  {
    entityName: 'BotDocument',
    errorMessage: 'Invalid BotDocument',
  },
);

// is this what we want?
const dateFromString = (dateString: string) => {
  return new Date(dateString);
};

export const sqliteToBot = (data: unknown): Bot => {

  const botData = parseBotData(data);

  const scheduledAt = botData.scheduled_at
    ? dateFromString(botData.scheduled_at)
    : undefined;

  return {
    uid: botData.uid,
    teamId: botData.team_id,
    token: botData.token,
    scope: botData.scope.split(','),
    ...(scheduledAt && {
      scheduledAt,
    }),
  };
};

export const botToSqlite = (data: Bot): BotDocument => {
  const bot = parseBot(data);

  return parseBotData({
    uid: bot.uid,
    team_id: bot.teamId,
    token: bot.token,
    scope: bot.scope.join(','),
    scheduled_at: bot.scheduledAt?.toISOString() ?? null,
  });
};

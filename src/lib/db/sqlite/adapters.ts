import { z } from 'zod';

import { Parser, parserFactory } from '@/lib/utils';
import { parseBot } from '@/parsers';
import type { Bot } from '@/types';
import { BotDocument } from './types';

const ZBotDocument = z.object({
  uid: z.string(),
  team_id: z.string(),
  channel_id: z.string(),
  token: z.string(),
  scope: z.string(),
  webhook_url: z.string(),
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
    channelId: botData.channel_id,
    webhookUrl: botData.webhook_url,
    ...(schedule && { schedule })
  };
};

export const botToSqlite = (data: Bot): BotDocument => {
  const bot = parseBot(data);

  const document: BotDocument = {
    uid: bot.uid,
    team_id: bot.teamId,
    channel_id: bot.channelId,
    token: bot.token,
    scope: bot.scope.join(','),
    webhook_url: bot.webhookUrl,
    schedule_id: bot.schedule?.scheduleId ?? null,
    cron: bot.schedule?.cron ?? null,
  }

  return parseBotData(document);
};

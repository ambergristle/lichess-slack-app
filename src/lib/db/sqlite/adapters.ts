import { z } from 'zod';

import type { Bot } from '@/lib/types';
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
}, {
  message: 'Invalid BotDocument',
});

export const sqliteToBot = (data: unknown): Bot => {

  const botData = ZBotDocument.parse(data);

  const schedule = botData.schedule_id && botData.cron
    ? {
      scheduleId: botData.schedule_id,
      cron: botData.cron,
    }
    : undefined;

  return {
    uid: botData.uid,
    teamId: botData.team_id,
    token: botData.token,
    scope: botData.scope.split(','),
    channelId: botData.channel_id,
    webhookUrl: botData.webhook_url,
    ...(schedule && { schedule }),
  };
};

const ZSchedule = z.object({
  scheduleId: z.string(),
  cron: z.string(), // schema?
});

export const botToSqlite = (data: Bot): BotDocument => {
  const bot = z.object({
    uid: z.string(),
    teamId: z.string(),
    channelId: z.string(),
    token: z.string(),
    scope: z.string().array(),
    webhookUrl: z.string(),
    schedule: ZSchedule.optional(),
  }, {
    message: 'Invalid Bot'
  }).parse(data);

  const document: BotDocument = {
    uid: bot.uid,
    team_id: bot.teamId,
    channel_id: bot.channelId,
    token: bot.token,
    scope: bot.scope.join(','),
    webhook_url: bot.webhookUrl,
    schedule_id: bot.schedule?.scheduleId ?? null,
    cron: bot.schedule?.cron ?? null,
  };

  return ZBotDocument.parse(document);
};

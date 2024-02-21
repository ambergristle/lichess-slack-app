import { z } from 'zod';

import { ZBot } from "@/schemas";
import type { Bot } from '@/types'
import { BotDocument } from './types';

export const sqliteToBot = (botData: unknown): Bot => {
  return z.object({
    uid: z.string(),
    team_id: z.string(),
    token: z.string(),
    scope: z.string(),
    scheduled_at: z.coerce.date().nullable(),
  }).transform((data) => ({
    uid: data.uid,
    teamId: data.team_id,
    token: data.token,
    scope: data.scope.split(','),
    ...(data.scheduled_at && {
      scheduledAt: data.scheduled_at
    })
  }))
  .parse(botData)
}

export const botToSqlite = (bot: Bot): BotDocument => {
  return ZBot.transform((bot) => ({
    uid: bot.uid,
    team_id: bot.teamId,
    token: bot.token,
    scope: bot.scope.join(','),
    ...(bot.scheduledAt && {
      scheduled_at: bot.scheduledAt?.toISOString(),
    })
  })).parse(bot)
}

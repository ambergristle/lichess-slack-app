import {
  blob,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';


export const Bot = sqliteTable(
  'bots',
  {
    id: text().primaryKey(),
    createdAt: integer({ mode: 'timestamp' }).notNull(),
    updatedAt: integer({ mode: 'timestamp' }).notNull(),
    channelId: text().notNull(),
    scope: text().notNull(),
    webhookUrl: text().notNull(),
    accessToken: blob({ mode: 'buffer' }).notNull(),
  }
);

export const ScheduledPuzzleJob = sqliteTable(
  'scheduled-puzzle-jobs',
  {
    id: text().primaryKey(),
    botId: text().notNull().references(() => Bot.id),
    createdAt: integer({ mode: 'timestamp' }).notNull(),
    updatedAt: integer({ mode: 'timestamp' }).notNull(),
    userId: text().notNull(),
    jobId: text().notNull(),
    cron: text().notNull(),
    timeZone: text().notNull(),
  }
);

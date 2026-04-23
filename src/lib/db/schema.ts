import {
  blob,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  updatedAt: integer({ mode: 'timestamp' }).notNull(),
};

export const Bot = sqliteTable('bots', {
  id: text().primaryKey(),
  botUserId: text().notNull().unique(),
  scope: text().notNull(),
  accessToken: blob({ mode: 'buffer' }).notNull(),
  ...timestamps,
});

export const BotChannel = sqliteTable(
  'bot_channels',
  {
    botId: text()
      .notNull()
      .references(() => Bot.id),
    channelId: text().notNull(),
    webhookUrl: text().notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.botId, table.channelId],
    }),
  ]
);

export type Schedule = typeof ScheduledPuzzleJob.$inferSelect;
export const ScheduledPuzzleJob = sqliteTable(
  'scheduled_puzzle_jobs',
  {
    botId: text()
      .notNull()
      .references(() => Bot.id),
    channelId: text().notNull(),
    jobId: text().notNull().unique(),
    cron: text().notNull(),
    timeZone: text().notNull(),
    locale: text().notNull(),
    deliveryUrl: text().notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.botId, table.channelId],
    }),
  ]
);

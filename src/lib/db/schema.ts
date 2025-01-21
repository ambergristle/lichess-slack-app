import {
  blob,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';


export const Bot = sqliteTable(
  'bots',
  {
    id: text().primaryKey(),
    createdAt: integer({ mode: 'timestamp' }).notNull(),
    updatedAt: integer({ mode: 'timestamp' }).notNull(),
    appId: text().notNull(),
    channelId: text().notNull(),
    scope: text().notNull(),
    accessToken: blob({ mode: 'buffer' }).notNull(),
    webhookUrl: text().notNull(),
  },
  (table) => [
    uniqueIndex('appIdUniqueIndex').on(table.appId),
  ]
);

// todo: composite keys?
export const ScheduledPuzzleJob = sqliteTable(
  'scheduled-puzzle-jobs',
  {
    id: text().primaryKey(),
    createdAt: integer({ mode: 'timestamp' }).notNull(),
    updatedAt: integer({ mode: 'timestamp' }).notNull(),
    botId: text().notNull().references(() => Bot.id),
    userId: text().notNull(), // encode/hash?
    jobId: text().notNull(),
    cron: text().notNull(),
    timeZone: text().notNull(),
  }
);

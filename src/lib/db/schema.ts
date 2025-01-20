import { sql } from 'drizzle-orm';
import {
  blob,
  check,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';


export const Bot = sqliteTable(
  'bots',
  {
    // uid + team id?
    id: text().primaryKey(),
    createdAt: integer({ mode: 'timestamp' }).notNull(),
    updatedAt: integer({ mode: 'timestamp' }).notNull(),
    appId: text().notNull(),
    channelId: text().notNull(),
    scope: text().notNull(),
    accessToken: blob({ mode: 'buffer' }).notNull(),
    webhookUrl: text().notNull(),
    jobId: text(),
    cron: text(),
    timeZone: text(),
  },
  (table) => [
    check(
      'schedule-id',
      sql`${table.jobId} IS NULL OR (${table.cron} IS NOT NULL AND ${table.timeZone} IS NOT NULL)`
    ),
  ]
);

import type { Context } from 'hono';
import { Logger } from 'drizzle-orm/logger';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { env } from '../utils/request';

/**
 * Initializes the database connection using a default
 * configuration. This will need to be updated if using Cloudflare
 * @param c
 * @returns
 */
export const getDb = <E>(c: Context<E & {
  Variables: {
    db: DB | undefined;
  }
}>): DB => {

  if (c.var.db) {
    return c.var.db;
  }

  // If using Cloudflare bindings, grab client from c.env.DB_BINDING
  const dbUrl = env('DATABASE_URL');
  const _db = drizzle(dbUrl, {
    // Set for Drizzle auto-casing
    casing: 'snake_case',
    logger: new QueryLogger(),
  });

  c.set('db', _db);

  return _db;
};

export type DB = LibSQLDatabase;

class QueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    console.log(
      'Query:\n'
      + `> ${query}\n`
      + `Params:${JSON.stringify(params, null, 2)}`
    );
  }
}

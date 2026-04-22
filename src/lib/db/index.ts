import type { Context } from 'hono';
import { Logger } from 'drizzle-orm/logger';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import config from '@/config';

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

  const _db = drizzle(config.databaseUrl, {
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

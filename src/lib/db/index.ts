import type { Context } from 'hono';
import { Logger } from 'drizzle-orm/logger';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { getEnvironmentVariable } from '../request';

/**
 * Initializes the database connection using a default
 * configuration. This will need to be updated if using Cloudflare
 * @param c
 * @returns
 */
export const getDb = <E>(c: Context<E & {
  Variables: {
    db: DrizzleDb | undefined;
  }
}>): DrizzleDb => {

  if (c.var.db) {
    return c.var.db;
  }

  // If using Cloudflare bindings, grab client from c.env.DB_BINDING
  const dbUrl = getEnvironmentVariable(c, 'DATABASE_URL');
  const _db = drizzle(dbUrl, {
    // Set for Drizzle auto-casing
    casing: 'snake_case',
    logger: new Something(),
  });

  c.set('db', _db);

  return _db;
};

export type DrizzleDb = LibSQLDatabase;

class Something implements Logger {
  logQuery(query: string, params: unknown[]): void {
    console.log(
      'Query:\n'
      + `> ${query}\n`
      + `Params:${JSON.stringify(params, null, 2)}`
    );
  }
}

import type { Logger } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/libsql';
import config from '@/config';

/**
 * Initializes the database connection using a default
 * configuration. This will need to be updated if using Cloudflare
 * @param c
 * @returns
 */
export const getDb = () => {
  return drizzle(config.databaseUrl, {
    casing: 'snake_case',
    logger: new QueryLogger(),
  });
};

export type DB = ReturnType<typeof getDb>;

class QueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    console.log('Query:\n' + `> ${query}\n` + `Params:${JSON.stringify(params, null, 2)}`);
  }
}

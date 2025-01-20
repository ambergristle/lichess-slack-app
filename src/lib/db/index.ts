import { Context } from 'hono';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';

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
  const _db = drizzle('kurz-db-local.sqlite', {
    // Set for Drizzle auto-casing
    casing: 'snake_case',
    logger: true,
  });

  c.set('db', _db);

  return _db;
};

export type DrizzleDb = BunSQLiteDatabase;

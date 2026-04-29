import type { DB } from '@/lib/db';
import { getDb } from '@/lib/db';
import { createMiddleware } from 'hono/factory';

export const dbProvider = () => {
  return createMiddleware<{ Variables: { db: DB } }>(async (c, next) => {
    if (!c.var.db) {
      c.set('db', getDb());
    }

    await next();
  });
};

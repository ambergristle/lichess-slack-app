import type { Context } from 'hono';
import { getConnInfo } from 'hono/bun';

import { KnownError } from './errors';


export const getClientIp = (c: Context): string | null => {
  // Proxied IP
  return c.req.header('X-Forwarded-For')
    ?? getConnInfo(c).remote.address
    ?? null;
};


/**
 * Get a required value from the environment. Is compatible with
 * all runtimes that support Hono, including Cloudflare.
 * @param key Environment variable key
 * @returns Value, or throws error
 */
export const env = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new KnownError(`Configuration Error: Environment missing ${key}`);
  }

  return value;
};

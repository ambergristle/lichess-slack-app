import type { Context } from 'hono';
import { env } from 'hono/adapter';
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
 * @param c Hono Context
 * @param key Environment variable key
 * @returns Value, or throws error
 */
export const getEnvironmentVariable = <
  T extends Record<string, string> = Record<string, string>,
  K extends string & keyof T = string
>(c: Context, key: K) => {
  const value = env<T>(c)[key];

  if (!value) {
    throw new KnownError(`Configuration Error: Environment missing ${key}`);
  }

  return value;
};


export const getIsProduction = (c: Context) => {
  const environment = env(c);
  return environment === 'production';
};

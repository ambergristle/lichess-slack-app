import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getConnInfo } from 'hono/bun';
import { HTTPException } from 'hono/http-exception';

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
    throw new HTTPException(500, {
      message: `ConfigurationError: Environment missing ${key}`,
    });
  }

  return value;
};

const BROWSERS = [
  'Mozilla',
  'AppleWebKit',
  'Chrome',
  'Safari',
  'Edge',
];

export const getIsBrowser = (c: Context) => {
  const {
    accepts,
    'user-agent': userAgent,
  } = c.req.header();

  if (userAgent) {
    const isBrowserAgent = BROWSERS.some((browser) => {
      return userAgent?.includes(browser);
    });

    return isBrowserAgent;
  }

  if (accepts) {
    return accepts.includes('html');
  }

  return false;
};

export const getIsProduction = (c: Context) => {
  const ENVIRONMENT = getEnvironmentVariable(c, 'ENVIRONMENT');
  return ENVIRONMENT === 'production';
};

import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { HTTPException } from 'hono/http-exception';


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
      message: `Configuration Error: Environment missing ${key}`,
    });
  }

  return value;
};

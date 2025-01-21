
import { ZodSchema } from 'zod';
import { SlackError } from './slack';
import { ValidationError } from './_errors';
import type { Context } from 'hono';
import { getConnInfo } from 'hono/bun';
import { getEnvironmentVariable } from './request';


export const getClientIp = (c: Context): string | null => {
  // Proxied IP
  return c.req.header('X-Forwarded-For')
    ?? getConnInfo(c).remote.address
    ?? null;
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



// Any type required for generic spread
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const slackRequestFactory = <A extends any[], R>(
  fn: (...args: A) => R
) => {
  return (..._args: A) => {
    try {
      return fn(..._args);
    } catch (cause) {
      // todo: find a better way to distinguish fetch errors
      const code = (cause as any).code;

      if (!code) throw cause;

      throw new SlackError('Slack API request failed', {
        code,
        cause,
      });
    }
  };
};


type ParserFactoryOptions = {
  entityName: string;
  errorMessage: string;
}

export const parserFactory = <
 Z extends ZodSchema
>(schema: Z, options: ParserFactoryOptions) => {
  return (data: unknown): Z['_output'] => {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const errors = result.error.issues.map((issue) => {
      const path = Array.isArray(issue.path)
        ? issue.path.join('.')
        : issue.path;

      return {
        path,
        message: issue.message,
      };
    });

    const {
      errorMessage,
      entityName,
    } = options;

    throw new ValidationError(errorMessage, {
      entityName,
      errors,
    });
  };
};

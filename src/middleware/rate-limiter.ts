import type { Env } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { getClientIp } from '@/lib/request';
import {
  Limiter,
  RollingRefillLimiter,
  WindowedRefillLimiter,
} from '@/lib/rate-limiter';


// https://lichess.org/api#section/Introduction/Rate-limiting
// 429 + Retry-After seconds?

// https://upstash.com/docs/qstash/api/api-ratelimiting
export const qStashBucket = new WindowedRefillLimiter<string>(30, 60);
// QstashDailyRatelimitError
// - daily: (500) publish-related endpoints
// - burst: per-second (100) limit on all endpoints

// RateLimit-Limit
// RateLimit-Remaining
// RateLimit-Reset
// Burst-RateLimit-Limit
// Burst-RateLimit-Remaining
// Burst-RateLimit-Reset

// https://api.slack.com/apis/rate-limits
export const slackBucket = new WindowedRefillLimiter(30, 60);
// 429 + Retry-After seconds
// - posting (1/s)
// - users.info (t4) (100/min)
// - conversations.info (t3) (50/min)
// - oauth.v2.access (t5)

const globalIpLimit = new RollingRefillLimiter<string>(50, 1);


type LimiterEnv = {
  Variables: {
    clientIp: string;
  }
}


/**
 * Apply a global rate limit, setting user IP in request
 * context for future use
 * @returns
 */
export const globalRateLimiter = () => {
  return createMiddleware<LimiterEnv>(async (c, next) => {
    const clientIp = getClientIp(c);

    if (clientIp === null) {
      throw new HTTPException(422, {
        message: 'Missing IP',
      });
    }

    c.set('clientIp', clientIp);

    const method = c.req.method;
    // GETs are generally cheaper ops
    const cost = method === 'GET' || method === 'OPTIONS'
      ? 1
      : 3;

    if (!globalIpLimit.consume(clientIp, cost)) {
      throw new HTTPException(429, {
        message: 'Too many requests',
      });
    }

    await next();
  });
};


export const userLimiter = (bucket: Limiter<string>, cost = 1) => {
  return createMiddleware<Env, string,
  {
    out: {
      form: {
        teamId: string;
        userId: string;
      }
    }
  }>(async (c, next) => {
    const userId = c.req.valid('form')?.userId;
    if (userId === undefined) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
      });
    }

    if (!bucket.consume(userId, cost)) {
      throw new HTTPException(429, {
        message: 'Too many requests',
      });
    }

    await next();
  });
};

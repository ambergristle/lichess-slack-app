import type { Context, Env, Input } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ConfigurationError } from '@/lib/utils/errors';

type RateLimitResult = {
  ok: boolean;
};

type Algorithm = {
  limit: (
    key: string,
    cost: number
  ) => RateLimitResult | Promise<RateLimitResult>;
};

export const rateLimit = <
  E extends Env,
  P extends string,
  I extends Input,
>(options: {
  algo?: Algorithm;
  cost: number;
  getKey: (c: Context<E, P, I>) => string | Promise<string>;
  getStore: (c: Context<E, P, I>) => any | Promise<any>;
}) => {
  return createMiddleware(async (c, next) => {
    const key = await options.getKey(c);
    if (!key) {
      throw new ConfigurationError('Key generator returned falsy value');
    }

    const store = await options.getStore(c);
    if (!store) {
      throw new ConfigurationError('No store returned');
    }

    // inject store
    // const algorithm: Algorithm = {};
    // const result = await algorithm.limit(key, options.cost);
    // if (!result.ok) {
    //   throw new RateLimitError();
    // }

    await next();
  });
};

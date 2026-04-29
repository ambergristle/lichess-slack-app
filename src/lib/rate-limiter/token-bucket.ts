
import { RateLimitError } from '../utils/errors';
import type { MemoryCache } from './cache';
import incrementScript from './increment.lua' with { type: "text" };
import type { LimitingAlgorithm, RateLimitResult, RedisClient, Store } from './types';


type IncrementArgs = [string, string, string, string, string];
type IncrementData = [number, number, number];

type TokenBucketOptions = {
  maxUnits: number;
  intervalSeconds: number;
  refillRate: number;
}

export class TokenBucket implements LimitingAlgorithm {
  public readonly policyName: 'token-bucket';

  private readonly client: RedisClient;
  private readonly cache: MemoryCache;

  public readonly maxUnits: number;
  private readonly intervalSeconds: number;
  private readonly refillRate: number;

  private readonly incrementScriptSha: Promise<string>;

  constructor(store: Store, options: TokenBucketOptions) {
    this.policyName = 'token-bucket';

    this.client = store.client;
    this.cache = store.blockedCache;

    if (options.maxUnits < 0) {
      throw new RateLimitError('Max quota units must be positive integer');
    }

    this.maxUnits = options.maxUnits;

    if (options.intervalSeconds < 1) {
      throw new RateLimitError('Refill interval seconds must be nonzero');
    }

    this.intervalSeconds = options.intervalSeconds;

    if (options.refillRate <= 0) {
      throw new RateLimitError('Refill interval rate must be nonzero');
    }

    this.refillRate = options.refillRate;

    this.incrementScriptSha = this.client.scriptLoad(incrementScript);
  }

  private get intervalMilliseconds(): number {
    return this.intervalSeconds * 1000;
  }

  static init(maxUnits: number, intervalSeconds: number, refillRate = 1): (store: Store) => LimitingAlgorithm {
    return (store) => new TokenBucket(store, {
      maxUnits,
      intervalSeconds,
      refillRate,
    });
  }

  public async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const now = Date.now();

    const bucket = this.cache.isBlocked(key);
    if (bucket.blocked) {
      return {
        allowed: false,
        policyName: this.policyName,
        identifier: key,
        windowSeconds: this.intervalSeconds,
        maxUnits: this.maxUnits,
        remainingUnits: 0,
        resetInSeconds: Math.ceil((bucket.resetAt - Date.now()) / 1000),
        pending: Promise.resolve(),
      }
    }

    const [
      allowed,
      remainingUnits,
      resetAt
    ] = await safeEval<IncrementArgs, IncrementData>(
      this.client,
      {
        hash: await this.incrementScriptSha,
        script: incrementScript,
      },
      [key],
      [
        this.maxUnits.toString(),
        this.intervalMilliseconds.toString(),
        this.refillRate.toString(),
        cost.toString(),
        now.toString(),
      ],
    );

    if (!allowed) {
      this.cache.blockUntil(key, resetAt);
    }

    return {
      allowed: Boolean(allowed),
      policyName: this.policyName,
      identifier: key,
      windowSeconds: this.intervalSeconds,
      maxUnits: this.maxUnits,
      remainingUnits,
      resetInSeconds: Math.ceil((resetAt - Date.now()) / 1000),
      pending: Promise.resolve(),
    };
  }

  public async reset(identifier: string): Promise<void> {
    await this.client.del(identifier);
  }

}

async function safeEval<TArgs extends unknown[], TData = unknown>(
  client: RedisClient,
  script: {
    hash: string;
    script: string;
  },
  keys: any[],
  args: TArgs,
): Promise<TData> {
  try {
    return await client.evalsha(script.hash, keys, args)
  } catch (error) {
    if (`${error}`.includes("NOSCRIPT")) {
      return await client.eval(script.script, keys, args)
    }
    throw error;
  }
}

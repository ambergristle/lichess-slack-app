import { MemoryStore, type Store } from '@/lib/store';


type WindowedRefillBucket = {
  tokenCount: number;
  createdAt: number;
}

/**
 * Tracks a user's token usage using some store
 * https://lucia-auth.com/rate-limit/token-bucket
 * persistence depends on the storage solution
 *
 * const ratelimit = new TokenBucketRateLimit<EntityId>(10, 2);
 */

export class WindowedRefillLimiter<_Key> {
  public maxTokens: number;
  public expiresInSeconds: number;

  /**
     *
     * @param maxTokens Maximum number of tokens a user can have at once
     * @param expiresInSeconds
     */
  constructor(maxTokens: number, expiresInSeconds: number) {
    this.storage = new MemoryStore<_Key, WindowedRefillBucket>();

    this.maxTokens = maxTokens;
    this.expiresInSeconds = expiresInSeconds;
  }

  private storage: Store<_Key, WindowedRefillBucket>;

  /**
     * Check whether user's available token count will cover cost
     * @param key A unique key associated with a user
     * @param cost The cost of a request (or other operation) to the user's token count
     * @returns Boolean indicating whether user can 'afford' cost
     */
  public async check(key: _Key, tokenCost: number): Promise<boolean> {
    if (tokenCost > this.maxTokens) {
      throw new Error();
    }

    const bucket = await this.storage.get(key);
    // If there's no bucket for a user, they can
    // Definitely 'afford' the cost
    if (bucket === null) {
      return true;
    }

    const now = Date.now();
    const millisecondsSinceCreated = now - bucket.createdAt;
    const expiresInMilliseconds = this.expiresInSeconds * 1000;

    if (millisecondsSinceCreated >= expiresInMilliseconds) {
      return true;
    }

    return bucket.tokenCount >= tokenCost;
  }

  /**
     *
     * @param key A unique key associated with a user
     * @param tokenCost The cost of a request (or other operation) to the user's token count
     * @returns Boolean indicating whether the user can afford the op (and has been charged)
     */
  public async consume(key: _Key, tokenCost: number): Promise<boolean> {
    if (tokenCost > this.maxTokens) {
      throw new Error();
    }

    let bucket = (await this.storage.get(key)) ?? null;

    const now = Date.now();
    // If there's no bucket for a user, create one
    if (bucket === null) {
      bucket = {
        // Include cost of current op in count
        tokenCount: this.maxTokens - tokenCost,
        createdAt: now,
      };

      this.storage.set(key, bucket);
      return true;
    }

    const millisecondsSinceCreated = now - bucket.createdAt;
    const expiresInMilliseconds = this.expiresInSeconds * 1000;

    if (millisecondsSinceCreated >= expiresInMilliseconds) {
      // Refill bucket entirely
      bucket.tokenCount = this.maxTokens;
    }

    if (bucket.tokenCount < tokenCost) {
      return false;
    }

    bucket.tokenCount -= tokenCost;
    this.storage.set(key, bucket);
    return true;
  }

  /** Reset key counter */
  public reset(key: _Key): void {
    this.storage.delete(key);
  }
}

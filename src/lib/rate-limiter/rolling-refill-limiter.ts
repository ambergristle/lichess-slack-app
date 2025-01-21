import { MemoryStore, type Store } from '@/lib/store';


type RollingRefillBucket = {
  tokenCount: number;
  refilledAt: number;
}


export class RollingRefillLimiter<_Key> {
  public maxTokens: number;
  public refillIntervalSeconds: number;

  /**
   * Track a user's token usage using a key-value store. Tokens are
   * refilled on each request, based on time elapsed since the last.
   * It is more complex than the fixed-window limiter, but handles
   * bursts better, and offers a smoother UX.
   *
   * Persistence depends on the storage solution
   * @see https://lucia-auth.com/rate-limit/token-bucket
   *
   * @param maxTokens Maximum number of tokens a user can have at once
   * @param refillIntervalSeconds Time-cost to refill a token (i.e., 1 token / refillIntervalSeconds)
   * @example
   * const limiter = new RollingRefillLimiter<EntityId>(10, 2);
   * limiter.check('<USER_ID>', 1);
   * limiter.consume('<USER_ID>', 1);
   */
  constructor(maxTokens: number, refillIntervalSeconds: number) {
    this.storage = new MemoryStore<_Key, RollingRefillBucket>();

    this.maxTokens = maxTokens;
    this.refillIntervalSeconds = refillIntervalSeconds;
  }

  private storage: Store<_Key, RollingRefillBucket>;

  /**
     * Check whether user's available token count will cover cost
     * @param key A unique key associated with a user
     * @param tokenCost The cost of a request (or other operation) to the user's token count
     * @returns Boolean indicating whether user can 'afford' cost
     */
  public async check(key: _Key, tokenCost: number): Promise<boolean> {
    if (tokenCost > this.maxTokens) {
      throw new Error();
    }

    const bucket = await this.storage.get(key);
    // If there's no bucket for a user, they can
    // definitely 'afford' the cost
    if (bucket === null) {
      return true;
    }

    const now = Date.now();
    const millisecondsSinceRefill = now - bucket.refilledAt;
    const refillIntervalMilliseconds = this.refillIntervalSeconds * 1000;

    const refill = Math.floor(millisecondsSinceRefill / refillIntervalMilliseconds);

    if (refill > 0) {
      // If user is eligible for a refill, check whether
      // post-refill token count will cover cost
      const countAfterRefill = bucket.tokenCount + refill;
      return Math.min(countAfterRefill, this.maxTokens) >= tokenCost;
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

    let bucket = await this.storage.get(key);

    const now = Date.now();
    // If there's no bucket for a user, create one
    if (bucket === null) {
      bucket = {
        // Include cost of current operation in count
        tokenCount: this.maxTokens - tokenCost,
        refilledAt: now,
      };

      this.storage.set(key, bucket);
      return true;
    }

    const millisecondsSinceRefill = now - bucket.refilledAt;
    const refillIntervalMilliseconds = this.refillIntervalSeconds * 1000;

    // Refill bucket proportionally to time
    // elapsed since last refill
    const refill = Math.floor(millisecondsSinceRefill / refillIntervalMilliseconds);
    // Refill up to max
    bucket.tokenCount = Math.min(bucket.tokenCount + refill, this.maxTokens);
    bucket.refilledAt = now;

    if (bucket.tokenCount < tokenCost) {
      return false;
    }

    bucket.tokenCount -= tokenCost;
    this.storage.set(key, bucket);
    return true;
  }

  /** Reset key counter */
  public async reset(key: _Key): Promise<void> {
    this.storage.delete(key);
  }
}

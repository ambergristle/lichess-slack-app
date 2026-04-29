import type { MemoryCache } from "./cache";

export type RateLimitInfo = {
  policyName: string;
  identifier: string;
  windowSeconds: number;
  maxUnits: number;
  remainingUnits: number;
  resetInSeconds: number;
}

export type RateLimitResult = RateLimitInfo & {
  allowed: boolean;
  pending: Promise<void>;
}

export abstract class LimitingAlgorithm {
  abstract readonly policyName: string;
  abstract readonly maxUnits: number;

  abstract consume(identifier: string, cost?: number): Promise<RateLimitResult>;

  abstract reset(identifier: string): Promise<void>;
}

export type RedisClient = {}

export type Store = {
  client: RedisClient;
  blockedCache: MemoryCache;
}

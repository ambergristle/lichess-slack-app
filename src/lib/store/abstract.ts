import { MaybePromise } from '../types';


/**
 * Low-latency stores are a common tool for tracking rate limit
 * usage, cacheing data, or other operations that require short-
 * term persistence with fast queries.
 *
 * Remote key-value stores (think JS Map in the cloud) like Redis
 * are typically used, especially in serverless contexts, where
 * process memory doesn't persist between sessions. At a minimum,
 * these stores need to be able to set, retrieve, and remove entries.
 */

export abstract class Store<_Key, Value> {

  public abstract get(key: _Key): MaybePromise<Value | null>;

  public abstract set(key: _Key, value: Value): MaybePromise<void>;

  public abstract delete(key: _Key): MaybePromise<void>;
}

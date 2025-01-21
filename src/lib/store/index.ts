import { Store } from './abstract';


export type { Store };

/**
 * @deprecated
 * This is for demonstration purposes only
 */

export class MemoryStore<_Key, Value> implements Store<_Key, Value>{

  private store = new Map<_Key, Value>();

  public get(key: _Key): Value | null {
    return this.store.get(key) ?? null;
  }

  public set(key: _Key, value: Value): void {
    this.store.set(key, value);
  }

  public delete(key: _Key): void {
    this.store.delete(key);
  }
}

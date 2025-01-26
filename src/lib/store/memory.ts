import { Store } from './abstract';

/**
 * @deprecated
 * This is for demonstration and development only
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

// const store = new Map<string, string>();

// export const memory = {
//   get: async (key: string) => {
//     return client.get(key);
//   },
//   set: async (key: string, value: string) => {
//     return client.set(key, value, {
//       EX: 60 * 60 * 24,
//     });
//   },
//   close: async () => {
//     if (client.isOpen) return client.quit();
//   },
// };

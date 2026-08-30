interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Minimal in-process TTL cache. Deliberately not backed by Redis/etc: a
 * single-instance deployment (Render's free tier is exactly this) doesn't
 * need distributed cache, and every cache hit here is one less request sent
 * to LinkedIn, which is the thing we actually want to minimize.
 */
export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

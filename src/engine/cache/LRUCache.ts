export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private onEvict?: (key: K, value: V) => void;

  constructor(capacity: number, onEvict?: (key: K, value: V) => void) {
    this.capacity = capacity;
    this.cache = new Map();
    this.onEvict = onEvict;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    // Refresh access order in Map
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (first inserted) item
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldestValue = this.cache.get(oldestKey)!;
        this.cache.delete(oldestKey);
        if (this.onEvict) {
          this.onEvict(oldestKey, oldestValue);
        }
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    const val = this.cache.get(key);
    const deleted = this.cache.delete(key);
    if (deleted && val && this.onEvict) {
      this.onEvict(key, val);
    }
    return deleted;
  }

  clear(): void {
    if (this.onEvict) {
      this.cache.forEach((val, key) => {
        this.onEvict!(key, val);
      });
    }
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

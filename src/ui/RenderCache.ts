// src/ui/RenderCache.ts
//
// Simple dirty-tracking cache for rendered assets (card art, character
// portraits, etc). The cache stores arbitrary key/value pairs and lets the
// caller mark keys as "dirty" so they are evicted on the next read. This is
// intentionally canvas-agnostic — the actual Canvas-to-image conversion
// happens in the Renderer; this layer just tracks "should we re-render?".
//
// Phase 12.3 ships only this cache + a memory helper. Full Canvas-level
// optimizations (dirty rects, off-screen buffers, requestAnimationFrame
// batching) live in the Renderer and are browser-specific.

/**
 * Dirty-tracking cache. Keys marked dirty are evicted on the next `get()` /
 * `has()` call. Insertion order is preserved (Map iteration), which `prune()`
 * relies on for its LRU-like eviction.
 */
export class RenderCache<K, V> {
  private cache: Map<K, V> = new Map();
  private dirty: Set<K> = new Set();

  /** Mark a key as dirty (will be evicted on next get or has). */
  markDirty(key: K): void {
    this.dirty.add(key);
  }

  /** Mark all cached keys as dirty. */
  markAllDirty(): void {
    this.dirty.clear();
    for (const key of this.cache.keys()) this.dirty.add(key);
  }

  /** Store a value and clear its dirty flag. */
  set(key: K, value: V): void {
    this.cache.set(key, value);
    this.dirty.delete(key);
  }

  /** Get a value. Returns undefined if dirty or not present. */
  get(key: K): V | undefined {
    if (this.dirty.has(key)) {
      this.cache.delete(key);
      this.dirty.delete(key);
      return undefined;
    }
    return this.cache.get(key);
  }

  /** Check if a key is in the cache and not dirty. */
  has(key: K): boolean {
    if (this.dirty.has(key)) return false;
    return this.cache.has(key);
  }

  /** Clear the entire cache. */
  clear(): void {
    this.cache.clear();
    this.dirty.clear();
  }

  /** Returns current size (dirty entries still in the map are excluded via eviction). */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Evict entries to keep size <= maxSize. Removes oldest insertion-order
   * entries first (LRU-like approximation — true LRU needs access-order).
   */
  prune(maxSize: number): void {
    if (this.cache.size <= maxSize) return;
    const toRemove = this.cache.size - maxSize;
    let removed = 0;
    for (const key of this.cache.keys()) {
      if (removed >= toRemove) break;
      this.cache.delete(key);
      // Keep dirty flag in sync so a later set() isn't surprised
      this.dirty.delete(key);
      removed++;
    }
  }
}

/**
 * Best-effort memory usage probe. Returns `jsHeapMB` when the runtime exposes
 * `performance.memory` (Chromium-based browsers); returns an empty object
 * otherwise so callers can branch safely.
 */
export function approximateMemoryUsage(): { jsHeapMB?: number } {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return { jsHeapMB: (performance as any).memory.usedJSHeapSize / 1024 / 1024 };
  }
  return {};
}
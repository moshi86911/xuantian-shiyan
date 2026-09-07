// tests/ui/RenderCache.test.ts
import { describe, it, expect } from 'vitest';
import { RenderCache, approximateMemoryUsage } from '../../src/ui/RenderCache';

describe('RenderCache', () => {
  it('starts empty', () => {
    const cache = new RenderCache<string, number>();
    expect(cache.getSize()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('set and get', () => {
    const cache = new RenderCache<string, number>();
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('has returns true for cached items', () => {
    const cache = new RenderCache<string, number>();
    cache.set('a', 1);
    expect(cache.has('a')).toBe(true);
  });

  it('markDirty removes on next get', () => {
    const cache = new RenderCache<string, number>();
    cache.set('a', 1);
    cache.markDirty('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.has('a')).toBe(false);
  });

  it('markAllDirty clears everything', () => {
    const cache = new RenderCache<string, number>();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.markAllDirty();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('clear removes all', () => {
    const cache = new RenderCache<string, number>();
    cache.set('a', 1);
    cache.clear();
    expect(cache.getSize()).toBe(0);
  });

  it('prune removes oldest entries', () => {
    const cache = new RenderCache<string, number>();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.prune(2);
    expect(cache.getSize()).toBe(2);
  });

  it('prune does nothing when under limit', () => {
    const cache = new RenderCache<string, number>();
    cache.set('a', 1);
    cache.prune(10);
    expect(cache.getSize()).toBe(1);
  });
});

describe('approximateMemoryUsage', () => {
  it('returns an object', () => {
    const usage = approximateMemoryUsage();
    expect(typeof usage).toBe('object');
  });
});
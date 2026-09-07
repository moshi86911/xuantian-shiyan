import { describe, it, expect } from 'vitest';

describe('Smoke Test', () => {
  it('vitest is configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('async test works', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});

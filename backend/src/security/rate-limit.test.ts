import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('rate limiter', () => {
  it('blocks after the limit and recovers after the window', () => {
    let t = 0;
    const limiter = createRateLimiter(2, 1000, () => t);
    expect(limiter.take('k')).toBe(true);
    expect(limiter.take('k')).toBe(true);
    expect(limiter.take('k')).toBe(false);
    t = 1001;
    expect(limiter.take('k')).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter(1, 1000, () => 0);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('b')).toBe(true);
    expect(limiter.take('a')).toBe(false);
  });
});

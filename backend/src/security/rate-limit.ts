interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window in-memory limiter. Good enough for a single server instance; swap for a
 * Redis-backed limiter (Redis is already in the stack) before running multiple instances.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  return {
    /** Returns true if the call is allowed, false if the key is over the limit. */
    take(key: string): boolean {
      const t = now();
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= t) buckets.delete(k);
      }
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        buckets.set(key, { count: 1, resetAt: t + windowMs });
        return true;
      }
      bucket.count += 1;
      return bucket.count <= limit;
    },
  };
}

export const signInLimiter = createRateLimiter(10, 15 * 60 * 1000);
export const signUpLimiter = createRateLimiter(10, 60 * 60 * 1000);
export const forgotPasswordLimiter = createRateLimiter(5, 60 * 60 * 1000);
export const resetPasswordLimiter = createRateLimiter(10, 60 * 60 * 1000);

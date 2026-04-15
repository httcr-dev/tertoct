type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const next: Bucket = { count: 1, resetAt: now + options.windowMs };
    buckets.set(key, next);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      retryAfterMs: options.windowMs,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  const allowed = existing.count <= options.maxRequests;
  const remaining = Math.max(0, options.maxRequests - existing.count);

  return {
    allowed,
    remaining,
    retryAfterMs: Math.max(0, existing.resetAt - now),
  };
}

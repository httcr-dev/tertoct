/**
 * In-memory rate limiter using a sliding fixed-window counter.
 *
 * Replaces the Firestore-based rate limiter for the auth cookie endpoint.
 * Trade-off: counters are per-process and reset on server restart.
 * This is acceptable for a single-server deployment (dev or small-scale
 * production) where the security goal is DoS prevention, not distributed
 * abuse tracking.
 *
 * For multi-instance production deployments, swap back to the Firestore
 * implementation or a Redis-backed store.
 */

export type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  /** If true, errors in the store are treated as "allowed". */
  failOpen?: boolean;
};

type WindowEntry = {
  count: number;
  windowStart: number;
};

// Module-level store: survives across requests within one Node.js process.
// Key format mirrors buildAuthRateLimitKey to stay compatible.
const store = new Map<string, WindowEntry>();

// Prune stale entries every 5 minutes so the Map doesn't grow unbounded.
const PRUNE_INTERVAL_MS = 5 * 60_000;
let lastPruneAt = Date.now();

function pruneIfNeeded(now: number, windowMs: number) {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  // Remove entries older than their own window.
  for (const [key, entry] of store) {
    const windowStart = Math.floor(now / windowMs) * windowMs;
    if (entry.windowStart < windowStart) {
      store.delete(key);
    }
  }
}

export function checkRateLimitMemory(
  key: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const resetAt = windowStart + options.windowMs;

  pruneIfNeeded(now, options.windowMs);

  const existing = store.get(key);

  // If the stored window has rolled over, start fresh.
  if (!existing || existing.windowStart < windowStart) {
    store.set(key, { count: 1, windowStart });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      retryAfterMs: resetAt - now,
    };
  }

  const nextCount = existing.count + 1;
  store.set(key, { count: nextCount, windowStart });

  return {
    allowed: nextCount <= options.maxRequests,
    remaining: Math.max(0, options.maxRequests - nextCount),
    retryAfterMs: Math.max(0, resetAt - now),
  };
}

/** Clears all in-memory rate limit counters (useful in tests or for manual reset). */
export function clearRateLimitMemory() {
  store.clear();
}

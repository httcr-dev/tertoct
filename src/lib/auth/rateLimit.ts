import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "./admin";

export type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const resetAt = windowStart + options.windowMs;
  const docId = `${key}:${windowStart}`;
  const ref = getAdminFirestore().collection("_rateLimits").doc(docId);

  try {
    const nextCount = await getAdminFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? Number(snap.data()?.count ?? 0) : 0;
      const count = current + 1;

      tx.set(
        ref,
        {
          key,
          count,
          windowStart,
          resetAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return count;
    });

    return {
      allowed: nextCount <= options.maxRequests,
      remaining: Math.max(0, options.maxRequests - nextCount),
      retryAfterMs: Math.max(0, resetAt - now),
    };
  } catch {
    // Fail-open to avoid auth outage if Firestore rate-limit store is unavailable.
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      retryAfterMs: options.windowMs,
    };
  }
}

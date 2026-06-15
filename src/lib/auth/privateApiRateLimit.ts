import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { checkRateLimitMemory } from "@/lib/auth/rateLimitMemory";

const WINDOW_MS = 60_000;

function rateLimitedResponse(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );
}

/**
 * Private API rate limit: in-memory for reads, Firestore for mutations.
 */
export async function enforcePrivateApiRateLimit(
  req: Request,
  uid: string,
): Promise<NextResponse | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();
  const isRead = method === "GET" || method === "HEAD";

  const isCheckinMutation =
    pathname.includes("/api/private/checkins") &&
    (method === "POST" || method === "DELETE");

  const maxRequests = isCheckinMutation ? 10 : isRead ? 300 : 100;
  const key = `api-private:${method}:${pathname}:${uid}`;

  if (isRead) {
    const limit = checkRateLimitMemory(key, {
      windowMs: WINDOW_MS,
      maxRequests,
      failOpen: true,
    });
    if (!limit.allowed) {
      return rateLimitedResponse(limit.retryAfterMs);
    }
    return null;
  }

  const limit = await checkRateLimit(key, {
    windowMs: WINDOW_MS,
    maxRequests,
    failOpen: false,
  });

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterMs);
  }

  return null;
}

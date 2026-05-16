import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/rateLimit";

const WINDOW_MS = 60_000;

/**
 * Firestore-backed rate limit for private API route handlers (distributed).
 */
export async function enforcePrivateApiRateLimit(
  req: Request,
  uid: string,
): Promise<NextResponse | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  const isCheckinMutation =
    pathname.includes("/api/private/checkins") &&
    (method === "POST" || method === "DELETE");

  const maxRequests = isCheckinMutation ? 10 : 100;
  const key = `api-private:${method}:${pathname}:${uid}`;

  const limit = await checkRateLimit(key, {
    windowMs: WINDOW_MS,
    maxRequests,
    failOpen: false,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  return null;
}

import type { NextRequest } from "next/server";
import { checkRateLimitMemory } from "@/lib/auth/rateLimitMemory";
import { getRequestIp } from "@/lib/proxy/requestIp";

const WINDOW_MS = 60_000;

function tooManyResponse() {
  return { allowed: false as const };
}

/**
 * Lightweight per-process rate limits in the Next.js proxy (Node runtime).
 * For multi-instance production, complement with Firestore limits on API routes.
 */
export function checkProxyRateLimit(req: NextRequest): { allowed: true } | ReturnType<typeof tooManyResponse> {
  const pathname = req.nextUrl.pathname;
  const method = (req.method ?? "GET").toUpperCase();
  const ip = getRequestIp(req);

  if (pathname.startsWith("/api/auth")) {
    const { allowed } = checkRateLimitMemory(`mw:api-auth:${method}:${ip}`, {
      windowMs: WINDOW_MS,
      maxRequests: 5,
    });
    if (!allowed) return tooManyResponse();
    return { allowed: true };
  }

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/private") &&
    !pathname.startsWith("/api/auth")
  ) {
    const { allowed } = checkRateLimitMemory(`mw:api-public:${method}:${ip}`, {
      windowMs: WINDOW_MS,
      maxRequests: 60,
    });
    if (!allowed) return tooManyResponse();
    return { allowed: true };
  }

  return { allowed: true };
}

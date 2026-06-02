import type { NextRequest } from "next/server";
import { checkRateLimitMemory } from "@/lib/auth/rateLimitMemory";
import { getRequestIp } from "@/lib/proxy/requestIp";

const WINDOW_MS = 60_000;

function isE2eOrEmulator(): boolean {
  return (
    process.env.NEXT_PUBLIC_E2E === "true" ||
    !!process.env.FIRESTORE_EMULATOR_HOST
  );
}

function tooManyResponse() {
  return { allowed: false as const };
}

/**
 * Lightweight per-process rate limits in the Next.js proxy (Node runtime).
 * Auth routes use a higher ceiling than before (login syncs cookie + claims).
 */
export function checkProxyRateLimit(req: NextRequest): { allowed: true } | ReturnType<typeof tooManyResponse> {
  const pathname = req.nextUrl.pathname;
  const method = (req.method ?? "GET").toUpperCase();
  const ip = getRequestIp(req);

  if (pathname.startsWith("/api/auth")) {
    const maxRequests = isE2eOrEmulator() ? 10_000 : 60;
    const { allowed } = checkRateLimitMemory(`mw:api-auth:${method}:${ip}`, {
      windowMs: WINDOW_MS,
      maxRequests,
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

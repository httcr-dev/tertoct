import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/cookies";
import { getClientIdentifier } from "@/lib/auth/clientIdentifier";
import { checkRateLimitMemory } from "@/lib/auth/rateLimitMemory";
import { verifyToken } from "@/lib/auth/verifyToken";
import { buildAuthRateLimitKey } from "@/lib/auth/rateLimitKey";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import {
  captureServerError,
  logServerEvent,
  trackStatusAnomaly,
} from "@/lib/observability/serverObservability";

// In-memory rate limits — no Firestore round-trips, sub-millisecond checks.
// Real security gate for POST is token verification (server-side JWT check),
// not the rate counter. The counter just prevents trivial DoS.
const POST_LIMIT = {
  windowMs: 60_000,
  maxRequests: 30,
} as const;

const DELETE_LIMIT = {
  windowMs: 60_000,
  // Clearing a session cookie is a low-risk operation — being too strict here
  // means a user can get stuck in a signed-in-but-blocked state.
  maxRequests: 100,
} as const;

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Forbidden origin" },
      { status: 403 },
    );
  }
  const ip = await getClientIdentifier();
  try {
    const limit = checkRateLimitMemory(
      buildAuthRateLimitKey({
        route: "auth-cookie",
        method: "POST",
        clientId: ip,
      }),
      POST_LIMIT,
    );

    if (!limit.allowed) {
      logServerEvent("warn", {
        route: "/api/auth/cookie",
        action: "rate-limit",
        errorCode: "RATE_LIMIT_GLOBAL",
        details: { ip, method: "POST" },
      });
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const payload = (await req.json()) as { token?: unknown };
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.token !== "string" ||
      payload.token.trim().length === 0
    ) {
      logServerEvent("warn", {
        route: "/api/auth/cookie",
        action: "validate-payload",
        errorCode: "INVALID_PAYLOAD",
        details: { ip, reason: "missing_or_invalid_token" },
      });
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    let decodedUid: string | null = null;
    try {
      const decoded = await verifyToken(payload.token);
      decodedUid = decoded.uid;
    } catch (error) {
      trackStatusAnomaly("/api/auth/cookie", 401);
      logServerEvent("warn", {
        route: "/api/auth/cookie",
        action: "verify-token",
        errorCode: "INVALID_TOKEN",
        details: { ip, reason: error instanceof Error ? error.message : "invalid_token" },
      });
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    if (decodedUid) {
      const uidLimit = checkRateLimitMemory(
        buildAuthRateLimitKey({
          route: "auth-cookie",
          method: "POST",
          clientId: ip,
          uid: decodedUid,
        }),
        POST_LIMIT,
      );
      if (!uidLimit.allowed) {
        logServerEvent("warn", {
          route: "/api/auth/cookie",
          action: "rate-limit",
          uid: decodedUid,
          errorCode: "RATE_LIMIT_UID",
          details: { ip, method: "POST" },
        });
        return NextResponse.json(
          { success: false, error: "Too many requests" },
          { status: 429 },
        );
      }
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, payload.token, getAuthCookieOptions());

    return NextResponse.json({ success: true });
  } catch (error) {
    const isMalformedJsonError = error instanceof SyntaxError;
    if (isMalformedJsonError) {
      logServerEvent("warn", {
        route: "/api/auth/cookie",
        action: "parse-json",
        errorCode: "MALFORMED_JSON",
        details: { ip, reason: (error as SyntaxError).message },
      });
      return NextResponse.json(
        { success: false, error: "Malformed JSON payload" },
        { status: 400 },
      );
    }
    trackStatusAnomaly("/api/auth/cookie", 500);
    captureServerError(error, {
      route: "/api/auth/cookie",
      action: "set-cookie",
      errorCode: "COOKIE_SET_FAILED",
      details: { ip },
    });
    return NextResponse.json(
      { success: false, error: "Failed to set cookie" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isTrustedMutationRequest(req)) {
      return NextResponse.json(
        { success: false, error: "Forbidden origin" },
        { status: 403 },
      );
    }
    const ip = await getClientIdentifier();
    const limit = checkRateLimitMemory(
      buildAuthRateLimitKey({
        route: "auth-cookie",
        method: "DELETE",
        clientId: ip,
      }),
      DELETE_LIMIT,
    );

    if (!limit.allowed) {
      logServerEvent("warn", {
        route: "/api/auth/cookie",
        action: "rate-limit",
        errorCode: "RATE_LIMIT_GLOBAL",
        details: { ip, method: "DELETE" },
      });
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    trackStatusAnomaly("/api/auth/cookie", 500);
    captureServerError(error, {
      route: "/api/auth/cookie",
      action: "delete-cookie",
      errorCode: "COOKIE_DELETE_FAILED",
    });
    return NextResponse.json(
      { success: false, error: "Failed to delete cookie" },
      { status: 500 },
    );
  }
}

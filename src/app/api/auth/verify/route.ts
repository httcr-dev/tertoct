import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/verifyToken";
import { getClientIdentifier } from "@/lib/auth/clientIdentifier";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { buildAuthRateLimitKey } from "@/lib/auth/rateLimitKey";
import { validateBody } from "@/lib/validations/validateRoute";
import { z } from "zod";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import {
  captureServerError,
  logServerEvent,
  trackStatusAnomaly,
} from "@/lib/observability/serverObservability";

const VERIFY_ENDPOINT_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
};
const verifyPayloadSchema = z.object({
  token: z.string().trim().min(1),
});

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ valid: false, error: "Forbidden origin" }, { status: 403 });
  }
  try {
    const ip = await getClientIdentifier();
    const limit = await checkRateLimit(
      buildAuthRateLimitKey({
        route: "auth-verify",
        method: "POST",
        clientId: ip,
      }),
      VERIFY_ENDPOINT_LIMIT,
    );

    if (!limit.allowed) {
      logServerEvent("warn", {
        route: "/api/auth/verify",
        action: "rate-limit",
        errorCode: "RATE_LIMIT_GLOBAL",
        details: { ip },
      });
      return NextResponse.json(
        { valid: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const { data: payload, errorResponse } = await validateBody(req, verifyPayloadSchema);
    if (errorResponse) return errorResponse;
    if (!payload) {
      return NextResponse.json({ valid: false, error: "Invalid payload" }, { status: 400 });
    }

    const decoded = await verifyToken(payload.token, { checkRevoked: true });
    const uidLimit = await checkRateLimit(
      buildAuthRateLimitKey({
        route: "auth-verify",
        method: "POST",
        clientId: ip,
        uid: decoded.uid,
      }),
      VERIFY_ENDPOINT_LIMIT,
    );
    if (!uidLimit.allowed) {
      logServerEvent("warn", {
        route: "/api/auth/verify",
        action: "rate-limit",
        uid: decoded.uid,
        errorCode: "RATE_LIMIT_UID",
        details: { ip },
      });
      return NextResponse.json(
        { valid: false, error: "Too many requests" },
        { status: 429 },
      );
    }
    return NextResponse.json({ valid: true });
  } catch (error) {
    trackStatusAnomaly("/api/auth/verify", 401);
    captureServerError(error, {
      route: "/api/auth/verify",
      action: "verify-token",
      errorCode: "INVALID_TOKEN",
    });
    return NextResponse.json(
      { valid: false, error: "Invalid token" },
      { status: 401 },
    );
  }
}

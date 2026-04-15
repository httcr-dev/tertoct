import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyToken } from "@/lib/auth/verifyToken";
import { checkRateLimit } from "@/lib/auth/rateLimit";

const VERIFY_ENDPOINT_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
};

async function getClientIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    const limit = checkRateLimit(`auth-verify:POST:${ip}`, VERIFY_ENDPOINT_LIMIT);

    if (!limit.allowed) {
      console.warn("[AUTH] Verify endpoint rate limited", { ip });
      return NextResponse.json(
        { valid: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ valid: false, error: "No token" }, { status: 400 });
    }

    await verifyToken(token, { checkRevoked: true });
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("[AUTH] Verify endpoint token validation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { valid: false, error: "Invalid token" },
      { status: 401 },
    );
  }
}

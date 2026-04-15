import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/cookies";
import { getClientIdentifier } from "@/lib/auth/clientIdentifier";
import { checkRateLimit } from "@/lib/auth/rateLimit";

const COOKIE_ENDPOINT_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
};

export async function POST(req: Request) {
  try {
    const ip = await getClientIdentifier();
    const limit = await checkRateLimit(
      `auth-cookie:POST:${ip}`,
      COOKIE_ENDPOINT_LIMIT,
    );

    if (!limit.allowed) {
      console.warn("[AUTH] Cookie endpoint rate limited", { ip });
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AUTH] Failed to set cookie", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, error: "Failed to set cookie" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const ip = await getClientIdentifier();
    const limit = await checkRateLimit(
      `auth-cookie:DELETE:${ip}`,
      COOKIE_ENDPOINT_LIMIT,
    );

    if (!limit.allowed) {
      console.warn("[AUTH] Cookie delete endpoint rate limited", { ip });
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AUTH] Failed to delete cookie", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, error: "Failed to delete cookie" },
      { status: 500 },
    );
  }
}

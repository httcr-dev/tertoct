import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/verifyToken";

export type PrivateRouteContext = {
  session: DecodedIdToken;
  role: string | null;
};

export async function getPrivateRouteContext(): Promise<
  | { ok: true; context: PrivateRouteContext }
  | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const session = await verifyToken(token, { checkRevoked: true });
    const role =
      typeof session.role === "string"
        ? session.role
        : session.admin === true
          ? "admin"
          : session.coach === true
            ? "coach"
            : session.student === true
              ? "student"
              : null;
    return { ok: true, context: { session, role } };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

export function requireRole(
  context: PrivateRouteContext,
  allowedRoles: string[],
): NextResponse | null {
  if (!context.role || !allowedRoles.includes(context.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

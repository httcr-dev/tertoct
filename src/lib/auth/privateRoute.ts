import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/verifyToken";
import {
  getFastVerifyTokenOptions,
  getStrictVerifyTokenOptions,
} from "@/lib/auth/verifyTokenOptions";
import { getAdminFirestore } from "@/lib/auth/admin";
import { timeAuthStep } from "@/lib/auth/authTiming";
import {
  decodeProxyAuthSession,
  decodedTokenFromProxySession,
  PROXY_AUTH_SESSION_HEADER,
  roleFromProxySession,
} from "@/lib/auth/proxySessionHeaders";
import { getCachedUserRole, setCachedUserRole } from "@/lib/auth/roleCache";

export type PrivateRouteContext = {
  session: DecodedIdToken;
  role: string | null;
};

export type PrivateRouteContextOptions = {
  /** When true, always verify the cookie token with revocation check. */
  requireRevocationCheck?: boolean;
};

function roleFromSessionClaims(session: DecodedIdToken): string | null {
  if (typeof session.role === "string") return session.role;
  if (session.admin === true) return "admin";
  if (session.coach === true) return "coach";
  if (session.student === true) return "student";
  return null;
}

function isPrivilegedRole(role: string | null): boolean {
  return role === "admin" || role === "coach";
}

type FirestoreRoleLookup = {
  role: string | null;
  failed: boolean;
};

async function resolveRoleFromFirestore(uid: string): Promise<FirestoreRoleLookup> {
  const cached = getCachedUserRole(uid);
  if (cached !== undefined) return { role: cached, failed: false };

  try {
    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data && typeof data.role === "string") {
        setCachedUserRole(uid, data.role);
        return { role: data.role, failed: false };
      }
    }
    setCachedUserRole(uid, null);
    return { role: null, failed: false };
  } catch (err) {
    console.warn("[privateRoute] Failed to fetch role from Firestore:", err);
    return { role: null, failed: true };
  }
}

async function resolveSessionAndRole(
  token: string,
  options: PrivateRouteContextOptions,
): Promise<{ session: DecodedIdToken; jwtRole: string | null }> {
  if (!options.requireRevocationCheck) {
    const headerStore = await headers();
    const proxySession = decodeProxyAuthSession(
      headerStore.get(PROXY_AUTH_SESSION_HEADER),
    );
    if (proxySession) {
      const session = decodedTokenFromProxySession(proxySession);
      return {
        session,
        jwtRole: roleFromProxySession(proxySession),
      };
    }
  }

  const verifyOptions = options.requireRevocationCheck
    ? getStrictVerifyTokenOptions()
    : getFastVerifyTokenOptions();

  const session = await verifyToken(token, verifyOptions);
  return { session, jwtRole: roleFromSessionClaims(session) };
}

export async function getPrivateRouteContext(
  options: PrivateRouteContextOptions = {},
): Promise<
  | { ok: true; context: PrivateRouteContext }
  | { ok: false; response: NextResponse }
> {
  return timeAuthStep("getPrivateRouteContext", async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    try {
      const { session, jwtRole } = await resolveSessionAndRole(token, options);
      let role = jwtRole;

      if (session.uid) {
        const lookup = await resolveRoleFromFirestore(session.uid);
        if (lookup.failed) {
          if (isPrivilegedRole(jwtRole)) {
            return {
              ok: false as const,
              response: NextResponse.json(
                { error: "Service unavailable" },
                { status: 503 },
              ),
            };
          }
        } else if (lookup.role !== null) {
          role = lookup.role;
        }
      }

      return { ok: true as const, context: { session, role } };
    } catch (error) {
      console.error("[privateRoute] Token verification failed:", error);
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
  });
}

export async function getPrivateRouteContextFromRequest(
  req: Request,
  options: PrivateRouteContextOptions = {},
): Promise<
  | { ok: true; context: PrivateRouteContext }
  | { ok: false; response: NextResponse }
> {
  const requireRevocationCheck =
    options.requireRevocationCheck ??
    !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
  return getPrivateRouteContext({ ...options, requireRevocationCheck });
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

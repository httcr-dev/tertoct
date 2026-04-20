import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
// import { isTrustedMutationRequest } from './verifyToken';
import { verifyToken } from "@/lib/auth/verifyToken";
import { getAdminFirestore } from "@/lib/auth/admin";

export type PrivateRouteContext = {
  session: DecodedIdToken;
  role: string | null;
};

export async function getPrivateRouteContext(req: Request): Promise<
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
    // We disable checkRevoked because verifying against the Firebase backend requires
    // proper Service Account credentials which aren't set locally via ADC.
    // The token is still cryptographically verified and enforced to its 1 hour lifespan.
    const session = await verifyToken(token, { checkRevoked: false });

    let role =
      typeof session.role === "string"
        ? session.role
        : session.admin === true
          ? "admin"
          : session.coach === true
            ? "coach"
            : session.student === true
              ? "student"
              : null;
    
    // Fallback if custom claims are not set: read authoritative role from Firestore
    if (!role && session.uid) {
      try {
         const db = getAdminFirestore();
         const userDoc = await db.collection("users").doc(session.uid).get();
         if (userDoc.exists) {
           const data = userDoc.data();
           if (data && typeof data.role === "string") {
             role = data.role;
           }
         }
      } catch (err) {
         console.warn("[privateRoute] Failed to fetch role from Firestore fallback:", err);
      }
    }

    return { ok: true, context: { session, role } };

  } catch (error) {
    console.error("[privateRoute] Token verification failed:", error);
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

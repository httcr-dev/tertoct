import { cookies } from "next/headers";
import { verifyToken } from "./verifyToken";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AUTH_COOKIE_NAME } from "./cookies";

/**
 * Retrieves and decodes the Firebase token from the HTTPOnly cookie.
 */
export async function getServerSession(): Promise<DecodedIdToken | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    return await verifyToken(token, { checkRevoked: true });
  } catch (error) {
    console.error("[RBAC] Failed to verify server session:", error);
    return null;
  }
}

/**
 * Validates that the current user has the specified custom claim.
 * Used for strict RBAC protection in API Routes or Server Components.
 */
export async function requireCustomClaim(claimKey: string): Promise<DecodedIdToken> {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Unauthorized: No valid session found.");
  }

  // We check if the custom claim exists and is true
  if (session[claimKey] !== true) {
    throw new Error(`Forbidden: Missing required custom claim '${claimKey}'.`);
  }

  return session;
}

/**
 * Validates that the current user matches one of the provided roles.
 * Supports custom claims defined either as { "admin": true } or { "role": "admin" }.
 */
export async function requireRoles(allowedRoles: string[]): Promise<DecodedIdToken> {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Unauthorized: No valid session found.");
  }

  // Check if any of the allowed roles match a truthy custom claim or a 'role' string claim
  const hasRequiredRole = allowedRoles.some((role) => {
    return session[role] === true || session.role === role;
  });

  if (!hasRequiredRole) {
    throw new Error(`Forbidden: Insufficient privileges. Required one of: ${allowedRoles.join(", ")}`);
  }

  return session;
}

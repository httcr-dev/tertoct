import type { User } from "firebase/auth";
import { postAuthSessionCookieWithRetry } from "@/lib/auth/clientSession";
import type { CookieSyncState } from "@/components/auth/cookieSyncState";

export type RefreshedSessionTokens = CookieSyncState & {
  token: string;
};

/**
 * Syncs custom claims from Firestore, forces a new ID token, and updates the
 * HTTP-only session cookie once.
 */
export async function refreshAuthClaimsFromServer(
  user: User,
): Promise<RefreshedSessionTokens> {
  const response = await fetch("/api/auth/refresh-claims", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    let message = "Failed to refresh session";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const tokenResult = await user.getIdTokenResult(true);
  await postAuthSessionCookieWithRetry(tokenResult.token);

  return {
    token: tokenResult.token,
    expiration: tokenResult.expirationTime,
  };
}

export function shouldRefreshAuthClaims(
  tokenClaims: Record<string, unknown> | undefined,
  profileRole: string,
): boolean {
  const claimRole = tokenClaims?.role;
  if (typeof claimRole !== "string" || claimRole.length === 0) {
    return true;
  }
  return claimRole !== profileRole;
}

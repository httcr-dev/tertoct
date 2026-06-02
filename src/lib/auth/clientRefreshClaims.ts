import { getFirebaseAuth } from "@/lib/firebase/client";
import { postAuthSessionCookie } from "@/lib/auth/clientSession";

/** Syncs custom claims from Firestore and refreshes the HTTP-only session cookie. */
export async function refreshAuthClaimsFromServer(): Promise<void> {
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

  const user = getFirebaseAuth().currentUser;
  if (!user) return;

  const token = await user.getIdToken(true);
  await postAuthSessionCookie(token);
}

import { getRedirectResult, type Auth, type UserCredential } from "firebase/auth";

/**
 * React Strict Mode (dev) mounts effects twice; the second getRedirectResult() returns null
 * because the redirect credential was already consumed. Share one promise per page load.
 */
let redirectResultPromise: Promise<UserCredential | null> | null = null;

export function consumeRedirectResult(auth: Auth): Promise<UserCredential | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch((error) => {
      redirectResultPromise = null;
      throw error;
    });
  }
  return redirectResultPromise;
}

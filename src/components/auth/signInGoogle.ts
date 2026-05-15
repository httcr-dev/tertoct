import {
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type AuthProvider,
} from "firebase/auth";

/** Popup first; redirect only when the environment blocks popups. */
const REDIRECT_FALLBACK_CODES = new Set([
  "auth/operation-not-supported-in-this-environment",
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
]);

function isRedirectFallbackError(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return typeof code === "string" && REDIRECT_FALLBACK_CODES.has(code);
}

export async function signInWithGooglePopupFirst(
  auth: Auth,
  provider: AuthProvider,
): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (!isRedirectFallbackError(error)) {
      throw error;
    }
    await signInWithRedirect(auth, provider);
  }
}

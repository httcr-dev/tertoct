export const AUTH_PENDING_KEY = "tertoct:auth-pending-until";
export const AUTH_PENDING_TTL_MS = 60_000;
/** Wait for Firebase after redirect before showing a failure (mobile can be slow). */
export const AUTH_PENDING_GRACE_MS = 5_000;

/** Safari iOS may clear sessionStorage across the Google redirect; localStorage survives. */
export function readAuthPendingExpiry(): number {
  if (typeof window === "undefined") return 0;
  try {
    const fromLocal = Number(window.localStorage.getItem(AUTH_PENDING_KEY) ?? 0);
    if (Number.isFinite(fromLocal) && fromLocal > 0) return fromLocal;
  } catch {
    /* ignore */
  }
  try {
    const fromSession = Number(window.sessionStorage.getItem(AUTH_PENDING_KEY) ?? 0);
    return Number.isFinite(fromSession) ? fromSession : 0;
  } catch {
    return 0;
  }
}

export function writeAuthPendingExpiry(expiresAt: number): void {
  const value = String(expiresAt);
  try {
    window.localStorage.setItem(AUTH_PENDING_KEY, value);
    return;
  } catch {
    /* fall through */
  }
  try {
    window.sessionStorage.setItem(AUTH_PENDING_KEY, value);
  } catch {
    /* ignore */
  }
}

export function clearAuthPendingExpiry(): void {
  try {
    window.localStorage.removeItem(AUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(AUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingSignIn(): boolean {
  return readAuthPendingExpiry() > Date.now();
}

export function markSignInPending(): void {
  writeAuthPendingExpiry(Date.now() + AUTH_PENDING_TTL_MS);
}

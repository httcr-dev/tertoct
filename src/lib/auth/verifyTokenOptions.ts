/**
 * Revoked-token checks call the Firebase backend (~100ms). Enabled in production
 * by default for sensitive mutations; disabled in dev/emulator unless
 * FIREBASE_CHECK_REVOKED=true.
 */
export function shouldVerifyRevokedToken(): boolean {
  if (process.env.FIREBASE_CHECK_REVOKED === "false") return false;
  if (process.env.FIREBASE_CHECK_REVOKED === "true") return true;
  if (
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

/** Fast path: skip revocation network round-trip (proxy, cookie sync, reads). */
export function getFastVerifyTokenOptions(): { checkRevoked: boolean } {
  return { checkRevoked: false };
}

/** Strict path: include revocation check for sensitive mutations. */
export function getStrictVerifyTokenOptions(): { checkRevoked: boolean } {
  return { checkRevoked: shouldVerifyRevokedToken() };
}

/** @deprecated Prefer getFastVerifyTokenOptions or getStrictVerifyTokenOptions */
export function getVerifyTokenOptions(): { checkRevoked: boolean } {
  return getFastVerifyTokenOptions();
}

/**
 * Revoked-token checks call the Firebase backend (~100ms). Enabled in production
 * by default; disabled in dev/emulator unless FIREBASE_CHECK_REVOKED=true.
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

export function getVerifyTokenOptions(): { checkRevoked: boolean } {
  return { checkRevoked: shouldVerifyRevokedToken() };
}

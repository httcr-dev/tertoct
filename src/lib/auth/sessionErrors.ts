export function isAuthRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || /too many requests/i.test(message);
}

/** Errors that mean the session cannot be established — safe to sign out. */
export function isFatalAuthSessionError(error: unknown): boolean {
  if (isAuthRateLimitError(error)) return false;

  const message = error instanceof Error ? error.message : String(error);
  if (/Sessão HTTP 401/i.test(message)) return true;
  if (/Invalid token/i.test(message)) return true;
  if (/Forbidden origin/i.test(message)) return true;

  const code = (error as { code?: string }).code;
  return code === "permission-denied" || code === "auth/unauthorized-domain";
}

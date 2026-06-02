/**
 * Call from instrumentation to fail fast in production when Admin is required.
 */
export function assertProductionFirebaseEnv(): void {
  if (process.env.SKIP_ENV_VALIDATION === "1") return;
  if (process.env.NODE_ENV !== "production") return;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !email || !key) {
    console.warn(
      "[env] Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY — Admin routes may fail.",
    );
  }
}

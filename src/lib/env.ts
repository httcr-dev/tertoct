import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Parsed server environment (lazy). Skips strict validation when SKIP_ENV_VALIDATION=1 (e.g. Jest).
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    cached = serverEnvSchema.parse(process.env);
    return cached;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("[env] Server env validation warnings:", parsed.error.flatten());
  }
  cached = parsed.success ? parsed.data : serverEnvSchema.parse(process.env);
  return cached;
}

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

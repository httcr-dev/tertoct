const ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_AUTH_TIMING === "true";

export function markAuthTiming(
  label: string,
  detail?: Record<string, unknown>,
): void {
  if (!ENABLED) return;
  console.debug(`[auth:timing] ${label}`, detail ?? "");
}

export async function timeAuthStep<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    markAuthTiming(label, { ms: Math.round(performance.now() - start) });
  }
}

export function timeAuthStepSync<T>(label: string, fn: () => T): T {
  if (!ENABLED) return fn();
  const start = performance.now();
  try {
    return fn();
  } finally {
    markAuthTiming(label, { ms: Math.round(performance.now() - start) });
  }
}

/**
 * Ensures a promise takes at least `ms` milliseconds (success or failure),
 * so loading indicators (e.g. react-hot-toast "loading") stay visible briefly.
 */
export function withMinDuration<T>(promise: Promise<T>, ms: number): Promise<T> {
  const started = Date.now();
  return promise.then(
    (value) => {
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, ms - elapsed);
      return remaining === 0
        ? value
        : new Promise<T>((resolve) => {
            setTimeout(() => resolve(value), remaining);
          });
    },
    (err: unknown) => {
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, ms - elapsed);
      return remaining === 0
        ? Promise.reject(err)
        : new Promise<T>((_, reject) => {
            setTimeout(() => reject(err), remaining);
          });
    },
  );
}

/** Default minimum visible loading time for mutations (ms). */
export const MUTATION_TOAST_MIN_MS = 380;

/** Client → server: persist Firebase idToken in httpOnly session cookie. */
import { isAuthRateLimitError } from "@/lib/auth/sessionErrors";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postAuthSessionCookie(token: string): Promise<void> {
  const response = await fetch("/api/auth/cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    let detail = `Sessão HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = `${detail}: ${body.error}`;
    } catch {
      /* ignore non-JSON bodies */
    }
    throw new Error(detail);
  }
}

/** Retries only on 429 (proxy or API rate limit). */
export async function postAuthSessionCookieWithRetry(
  token: string,
  maxAttempts = 3,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await postAuthSessionCookie(token);
      return;
    } catch (error) {
      lastError = error;
      if (!isAuthRateLimitError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      await sleep(800 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function deleteAuthSessionCookie(): Promise<void> {
  await fetch("/api/auth/cookie", { method: "DELETE" });
}

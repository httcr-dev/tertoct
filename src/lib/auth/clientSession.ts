/** Client → server: persist Firebase idToken in httpOnly session cookie. */
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

export async function deleteAuthSessionCookie(): Promise<void> {
  await fetch("/api/auth/cookie", { method: "DELETE" });
}

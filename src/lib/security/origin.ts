function tryParseAllowedOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function isTrustedMutationRequest(req: Request): boolean {
  const requestUrl = new URL(req.url);
  const requestOrigin = requestUrl.origin;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  const allowedOrigins = new Set<string>([requestOrigin]);
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    for (const item of envOrigins.split(",")) {
      const parsed = tryParseAllowedOrigin(item);
      if (parsed) {
        allowedOrigins.add(parsed);
      }
    }
  }

  if (origin) {
    return allowedOrigins.has(origin);
  }

  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Allow requests without origin/referer only in local dev.
  return process.env.NODE_ENV !== "production";
}

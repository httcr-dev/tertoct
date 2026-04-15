export function isTrustedMutationRequest(req: Request): boolean {
  const requestUrl = new URL(req.url);
  const requestOrigin = requestUrl.origin;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  const allowedOrigins = new Set<string>([requestOrigin]);
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    for (const item of envOrigins.split(",")) {
      const value = item.trim();
      if (value) {
        allowedOrigins.add(value);
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

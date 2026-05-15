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

function shouldSkipWwwApexToggle(hostname: string): boolean {
  if (hostname === "localhost") return true;
  if (hostname.startsWith("[")) return true; // IPv6
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true; // IPv4 literal
  return false;
}

/** Adds `origin` plus apex/www counterpart when applicable (avoids 403 when proxy uses one host and the browser uses the other). */
function addOriginAndWwwPair(origin: string, into: Set<string>): void {
  const normalized = tryParseAllowedOrigin(origin);
  if (!normalized) return;
  into.add(normalized);
  try {
    const u = new URL(normalized);
    if (shouldSkipWwwApexToggle(u.hostname)) return;
    const host = u.hostname;
    const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const portPart = u.port ? `:${u.port}` : "";
    into.add(`${u.protocol}//${altHost}${portPart}`);
  } catch {
    /* ignore malformed derived origin */
  }
}

function collectAllowedOrigins(req: Request): Set<string> {
  const into = new Set<string>();
  const requestUrl = new URL(req.url);
  addOriginAndWwwPair(requestUrl.origin, into);

  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto =
    req.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      ?.toLowerCase() ?? null;
  const scheme =
    xfProto === "http" || xfProto === "https"
      ? xfProto
      : (requestUrl.protocol.replace(":", "") || "https").toLowerCase();

  if (xfHost) {
    try {
      addOriginAndWwwPair(new URL(`${scheme}://${xfHost}`).origin, into);
    } catch {
      /* ignore */
    }
  }

  const hostHeader = req.headers.get("host")?.trim();
  if (hostHeader) {
    try {
      addOriginAndWwwPair(new URL(`${scheme}://${hostHeader}`).origin, into);
    } catch {
      /* ignore */
    }
  }

  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    for (const item of envOrigins.split(",")) {
      const parsed = tryParseAllowedOrigin(item);
      if (parsed) addOriginAndWwwPair(parsed, into);
    }
  }

  return into;
}

/**
 * True when the request is a same-site browser mutation to our app.
 * `Sec-Fetch-Site` is forbidden to scripts — useful when Origin/Referer are missing (some mobile WebViews / privacy modes).
 */
function isSameSiteBrowserMutation(req: Request): boolean {
  const mode = req.headers.get("sec-fetch-site")?.toLowerCase();
  return mode === "same-origin" || mode === "same-site";
}

export function isTrustedMutationRequest(req: Request): boolean {
  const allowedOrigins = collectAllowedOrigins(req);

  const rawOrigin = req.headers.get("origin");
  const origin =
    rawOrigin && rawOrigin.toLowerCase() !== "null" ? rawOrigin : null;
  const referer = req.headers.get("referer");

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

  if (process.env.NODE_ENV === "production" && isSameSiteBrowserMutation(req)) {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

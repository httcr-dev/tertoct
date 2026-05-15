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

/** ALLOWED_ORIGINS may be a full URL or a bare hostname (e.g. tertoct.vercel.app). */
function parseAllowedOriginEntry(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("://")) {
    return tryParseAllowedOrigin(trimmed);
  }
  return tryParseAllowedOrigin(`https://${trimmed}`);
}

function shouldSkipWwwApexToggle(hostname: string): boolean {
  if (hostname === "localhost") return true;
  if (hostname.startsWith("[")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  return false;
}

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
    /* ignore */
  }
}

/** Dev tunnels (ngrok, LAN) where the browser Origin differs from localhost in req.url. */
const DEV_TUNNEL_HOST_RE =
  /\.(ngrok-free\.(dev|app)|ngrok\.(io|app))$/i;

export function isDevTunnelHostname(hostname: string): boolean {
  return (
    DEV_TUNNEL_HOST_RE.test(hostname) ||
    hostname === "localhost" ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname)
  );
}

function isDevTunnelOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    return isDevTunnelHostname(new URL(origin).hostname);
  } catch {
    return false;
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
      const parsed = parseAllowedOriginEntry(item);
      if (parsed) addOriginAndWwwPair(parsed, into);
    }
  }

  return into;
}

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
    if (allowedOrigins.has(origin)) return true;
    if (isDevTunnelOrigin(origin)) return true;
    return false;
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refererOrigin)) return true;
      if (isDevTunnelOrigin(refererOrigin)) return true;
    } catch {
      return false;
    }
    return false;
  }

  if (process.env.NODE_ENV === "production" && isSameSiteBrowserMutation(req)) {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

import type { NextRequest } from "next/server";

/**
 * Best-effort client IP for rate limiting in proxy (Node runtime).
 * Honor TRUST_PROXY_HEADERS when deploying behind a trusted reverse proxy.
 */
export function getRequestIp(req: NextRequest): string {
  const trusted = process.env.TRUST_PROXY_HEADERS === "true";
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  if (trusted && forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  if (trusted && realIp?.trim()) {
    return realIp.trim().slice(0, 128);
  }

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  if (realIp?.trim()) return realIp.trim().slice(0, 128);

  return "unknown-ip";
}

import { headers } from "next/headers";
import { createHash } from "node:crypto";

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[a-fA-F0-9:]+$/;

function isIpLike(value: string): boolean {
  return IPV4_RE.test(value) || IPV6_RE.test(value);
}

export function sanitizeHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 256);
  if (!trimmed) return null;
  return trimmed.replace(/[^\w:., -]/g, "");
}

function firstForwardedIp(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  const candidate = forwardedFor.split(",")[0]?.trim();
  if (!candidate || !isIpLike(candidate)) return null;
  return candidate;
}

export async function getClientIdentifier(): Promise<string> {
  const headerStore = await headers();
  const trustedProxy = process.env.TRUST_PROXY_HEADERS === "true";
  const realIp = sanitizeHeaderValue(headerStore.get("x-real-ip"));
  const forwardedIp = sanitizeHeaderValue(firstForwardedIp(headerStore.get("x-forwarded-for")));
  const userAgent = sanitizeHeaderValue(headerStore.get("user-agent")) ?? "unknown-agent";

  const trustedIp =
    trustedProxy && realIp && isIpLike(realIp)
      ? realIp
      : trustedProxy && forwardedIp && isIpLike(forwardedIp)
        ? forwardedIp
        : null;

  const fallbackIp =
    (realIp && isIpLike(realIp) && realIp) ||
    (forwardedIp && isIpLike(forwardedIp) && forwardedIp) ||
    "unknown-ip";

  const fingerprintSeed = trustedIp ?? `${fallbackIp}|${userAgent}`;
  const digest = createHash("sha256").update(fingerprintSeed).digest("hex").slice(0, 24);

  return `cid:${digest}`;
}

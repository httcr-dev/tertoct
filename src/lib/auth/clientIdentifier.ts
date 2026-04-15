import { headers } from "next/headers";

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[a-fA-F0-9:]+$/;

function isIpLike(value: string): boolean {
  return IPV4_RE.test(value) || IPV6_RE.test(value);
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

  if (!trustedProxy) {
    // Fail-safe: if edge trust isn't explicitly configured, do not trust spoofable headers.
    return "untrusted-edge";
  }

  const realIp = headerStore.get("x-real-ip");
  if (realIp && isIpLike(realIp.trim())) {
    return realIp.trim();
  }

  const forwardedIp = firstForwardedIp(headerStore.get("x-forwarded-for"));
  if (forwardedIp) {
    return forwardedIp;
  }

  return "unknown-ip";
}

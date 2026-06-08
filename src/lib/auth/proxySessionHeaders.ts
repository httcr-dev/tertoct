import type { DecodedIdToken } from "firebase-admin/auth";

/** Set by src/proxy.ts after token verification; never trust client-supplied values. */
export const PROXY_AUTH_SESSION_HEADER = "x-tertoct-auth-session";

export type ProxyAuthSession = {
  uid: string;
  role?: string;
  admin?: boolean;
  coach?: boolean;
  student?: boolean;
  exp?: number;
};

export function encodeProxyAuthSession(session: DecodedIdToken): string {
  const payload: ProxyAuthSession = {
    uid: session.uid,
    role: typeof session.role === "string" ? session.role : undefined,
    admin: session.admin === true ? true : undefined,
    coach: session.coach === true ? true : undefined,
    student: session.student === true ? true : undefined,
    exp: typeof session.exp === "number" ? session.exp : undefined,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeProxyAuthSession(
  header: string | null | undefined,
): ProxyAuthSession | null {
  if (!header) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    ) as ProxyAuthSession;
    if (typeof parsed.uid !== "string" || parsed.uid.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function decodedTokenFromProxySession(
  session: ProxyAuthSession,
): DecodedIdToken {
  return session as DecodedIdToken;
}

export function roleFromProxySession(session: ProxyAuthSession): string | null {
  if (typeof session.role === "string" && session.role.length > 0) {
    return session.role;
  }
  if (session.admin === true) return "admin";
  if (session.coach === true) return "coach";
  if (session.student === true) return "student";
  return null;
}

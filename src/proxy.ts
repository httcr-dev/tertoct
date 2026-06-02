import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/verifyToken";
import { getVerifyTokenOptions } from "@/lib/auth/verifyTokenOptions";
import { isAuthorizedForPath } from "@/lib/auth/authorization";
import {
  captureServerError,
  logServerEvent,
  trackStatusAnomaly,
} from "@/lib/observability/serverObservability";
import { checkProxyRateLimit } from "@/lib/proxy/proxyRateLimit";

function generateNonce(): string {
  return crypto.randomUUID();
}

function isLikelyHttps(req: NextRequest): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

function emulatorCspSources(): string {
  const usingEmulators =
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";
  if (!usingEmulators) return "";
  return [
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:9099",
    "http://localhost:9099",
    "ws://127.0.0.1:8080",
    "ws://localhost:8080",
  ].join(" ");
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://va.vercel-scripts.com"
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com https://accounts.google.com https://va.vercel-scripts.com`;
  const emulatorSrc = emulatorCspSources();

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    `connect-src 'self' https: *.google-analytics.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com${emulatorSrc ? ` ${emulatorSrc}` : ""}`,
    "frame-src https://accounts.google.com https://*.firebaseapp.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function withSecurityHeaders(
  response: NextResponse,
  nonce: string,
  req?: NextRequest,
): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (req && isLikelyHttps(req)) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  response.headers.set("x-nonce", nonce);
  return response;
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/private")
  );
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function rateLimitedResponse(req: NextRequest, nonce: string) {
  if (isApiPath(req.nextUrl.pathname)) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
      nonce,
      req,
    );
  }
  return withSecurityHeaders(
    NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    nonce,
    req,
  );
}

function unauthenticatedResponse(req: NextRequest, nonce: string) {
  if (isApiPath(req.nextUrl.pathname)) {
    trackStatusAnomaly(req.nextUrl.pathname, 401);
    return withSecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      nonce,
      req,
    );
  }

  return withSecurityHeaders(
    NextResponse.redirect(new URL("/", req.url)),
    nonce,
    req,
  );
}

function forbiddenResponse(req: NextRequest, nonce: string) {
  if (isApiPath(req.nextUrl.pathname)) {
    trackStatusAnomaly(req.nextUrl.pathname, 403);
    return withSecurityHeaders(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      nonce,
      req,
    );
  }

  return withSecurityHeaders(
    NextResponse.redirect(new URL("/dashboard", req.url)),
    nonce,
    req,
  );
}

export async function proxy(req: NextRequest) {
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const pathname = req.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);

  const publicRl = checkProxyRateLimit(req);
  if (!publicRl.allowed) {
    return rateLimitedResponse(req, nonce);
  }

  if (!isProtected) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
      req,
    );
  }

  const authToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!authToken) {
    return unauthenticatedResponse(req, nonce);
  }

  try {
    const decodedToken = await verifyToken(authToken, getVerifyTokenOptions());
    const authorized = isAuthorizedForPath(pathname, decodedToken);

    if (!authorized) {
      logServerEvent("warn", {
        route: pathname,
        action: "proxy-authorize",
        uid: decodedToken.uid,
        errorCode: "ROLE_FORBIDDEN",
        status: 403,
      });
      return forbiddenResponse(req, nonce);
    }

    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
      req,
    );
  } catch (error) {
    captureServerError(error, {
      route: pathname,
      action: "proxy-verify-session",
      errorCode: "TOKEN_INVALID_OR_REVOKED",
      status: 401,
    });
    return unauthenticatedResponse(req, nonce);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

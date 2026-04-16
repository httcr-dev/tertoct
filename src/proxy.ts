import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/verifyToken";
import { isAuthorizedForPath } from "@/lib/auth/authorization";
import {
  captureServerError,
  logServerEvent,
  trackStatusAnomaly,
} from "@/lib/observability/serverObservability";

function generateNonce(): string {
  return crypto.randomUUID();
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: *.google-analytics.com",
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
): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
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

function unauthenticatedResponse(req: NextRequest, nonce: string) {
  if (isApiPath(req.nextUrl.pathname)) {
    trackStatusAnomaly(req.nextUrl.pathname, 401);
    return withSecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      nonce,
    );
  }

  return withSecurityHeaders(
    NextResponse.redirect(new URL("/", req.url)),
    nonce,
  );
}

function forbiddenResponse(req: NextRequest, nonce: string) {
  if (isApiPath(req.nextUrl.pathname)) {
    trackStatusAnomaly(req.nextUrl.pathname, 403);
    return withSecurityHeaders(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      nonce,
    );
  }

  return withSecurityHeaders(
    NextResponse.redirect(new URL("/dashboard", req.url)),
    nonce,
  );
}

export async function middleware(req: NextRequest) {
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const pathname = req.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);

  if (!isProtected) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
    );
  }

  const authToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!authToken) {
    return unauthenticatedResponse(req, nonce);
  }

  try {
    const decodedToken = await verifyToken(authToken);
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

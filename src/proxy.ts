import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/verifyToken";
import { isAuthorizedForPath } from "@/lib/auth/authorization";

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/private");
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function unauthenticatedResponse(req: NextRequest) {
  if (isApiPath(req.nextUrl.pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/", req.url));
}

function forbiddenResponse(req: NextRequest) {
  if (isApiPath(req.nextUrl.pathname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);

  if (!isProtected) {
    return NextResponse.next();
  }

  const authToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!authToken) {
    return unauthenticatedResponse(req);
  }

  try {
    const decodedToken = await verifyToken(authToken);
    const authorized = isAuthorizedForPath(pathname, decodedToken);

    if (!authorized) {
      console.warn("[AUTHZ] Role denied", {
        path: pathname,
        uid: decodedToken.uid,
      });
      return forbiddenResponse(req);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("[AUTH] Session validation failed", {
      path: pathname,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return unauthenticatedResponse(req);
  }
}

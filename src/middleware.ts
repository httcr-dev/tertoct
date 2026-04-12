import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/verifyToken";

export async function middleware(req: NextRequest) {
  const authToken = req.cookies.get("authToken")?.value;

  if (!authToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await verifyToken(authToken);
  } catch (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/api/private")) {
    return NextResponse.next();
  } else {
    return NextResponse.next();
  }
}

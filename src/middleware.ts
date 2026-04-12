import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/verifyToken";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isValid = await verifyToken(token);

  if (!isValid) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

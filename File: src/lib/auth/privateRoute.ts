import { NextResponse } from "next/server";
import { isTrustedMutationRequest } from "./verifyToken";
import { logAuthEvent } from "../observability/authLogger";

export type PrivateRouteContext = {
  session: DecodedIdToken;
  role: string | null;
};

export async function getPrivateRouteContext(req: Request): Promise<PrivateRouteContext> {
  const ip = await getClientIdentifier();
  try {
    const limit = checkRateLimitMemory(
      buildAuthRateLimitKey({
        route: req.nextUrl.pathname,
        method: req.method,
        clientId: ip,
        uid: null,
      }),
      { windowMs: 60 * 1000, maxRequests: 5 },
    );

    if (limit) {
      throw new Error("Too many requests");
    }

    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      throw new Error("Missing authorization header");
    }

    const session = await verifyToken(token);
    logAuthEvent({ route: req.nextUrl.pathname, action: "AUTH_SUCCESS" });
    return { session, role: session.role };
  } catch (error) {
    logAuthEvent({ route: req.nextUrl.pathname, action: "AUTH_FAILURE", error: error.message }, "warn");
    throw new Error("Unauthorized");
  }
}

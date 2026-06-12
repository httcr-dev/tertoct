import { NextResponse } from "next/server";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import {
  getPrivateRouteContextFromRequest,
  requireRole,
  type PrivateRouteContext,
} from "@/lib/auth/privateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";

export type PrivateMutationContext = {
  req: Request;
  auth: PrivateRouteContext;
};

type PrivateMutationOptions = {
  roles: string[];
};

type PrivateMutationHandler = (
  ctx: PrivateMutationContext,
) => Promise<NextResponse>;

/** Shared preamble for private mutation routes: origin, auth, role, rate limit. */
export async function withPrivateMutation(
  req: Request,
  options: PrivateMutationOptions,
  handler: PrivateMutationHandler,
): Promise<NextResponse> {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const authResult = await getPrivateRouteContextFromRequest(req);
  if (!authResult.ok) return authResult.response;

  const forbidden = requireRole(authResult.context, options.roles);
  if (forbidden) return forbidden;

  const rateLimited = await enforcePrivateApiRateLimit(
    req,
    authResult.context.session.uid,
  );
  if (rateLimited) return rateLimited;

  return handler({ req, auth: authResult.context });
}

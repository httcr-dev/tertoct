import { NextResponse } from "next/server";
import { syncCustomClaimsFromFirestore } from "@/lib/auth/customClaims";
import { getPrivateRouteContext } from "@/lib/auth/privateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import { captureServerError } from "@/lib/observability/serverObservability";

export const runtime = "nodejs";

/**
 * Syncs Auth custom claims from Firestore. Client should call getIdToken(true)
 * and refresh the session cookie afterward.
 */
export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;

  try {
    const role = await syncCustomClaimsFromFirestore(auth.context.session.uid);
    if (!role) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, role });
  } catch (error) {
    captureServerError(error, {
      route: "/api/auth/refresh-claims",
      action: "sync-claims",
      uid: auth.context.session.uid,
      errorCode: "CLAIMS_SYNC_FAILED",
    });
    return NextResponse.json(
      { error: "Failed to refresh session claims" },
      { status: 500 },
    );
  }
}

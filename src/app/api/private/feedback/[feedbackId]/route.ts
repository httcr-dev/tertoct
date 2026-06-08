import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import { getPrivateRouteContextFromRequest } from "@/lib/auth/privateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContextFromRequest(req);
  if (!auth.ok) return auth.response;

  const rateLimited = await enforcePrivateApiRateLimit(req, auth.context.session.uid);
  if (rateLimited) return rateLimited;

  const { feedbackId } = await params;
  const ref = getAdminFirestore().collection("feedbacks").doc(feedbackId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const feedback = snap.data() ?? {};
  const role = auth.context.role;
  const canDelete =
    feedback.userId === auth.context.session.uid ||
    role === "coach" ||
    role === "admin";
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ success: true });
}

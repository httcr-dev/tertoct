import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) return forbidden;

  const { planId } = await params;
  const ref = getAdminFirestore().collection("plans").doc(planId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const active = snap.data()?.active !== false;
  await ref.update({ active: !active });
  return NextResponse.json({ success: true, active: !active });
}

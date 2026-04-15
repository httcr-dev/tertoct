import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  price: z.number().finite().min(0).optional(),
  classesPerWeek: z.number().int().min(1).max(14).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
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
  const { data, errorResponse } = await validateBody(req, updatePlanSchema);
  if (errorResponse) return errorResponse;
  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await getAdminFirestore().collection("plans").doc(planId).update(data);
  return NextResponse.json({ success: true });
}

export async function DELETE(
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
  const linkedUsers = await getAdminFirestore()
    .collection("users")
    .where("planId", "==", planId)
    .limit(1)
    .get();
  if (!linkedUsers.empty) {
    return NextResponse.json(
      { error: "Não é possível excluir este plano: há alunos vinculados." },
      { status: 409 },
    );
  }

  await getAdminFirestore().collection("plans").doc(planId).delete();
  return NextResponse.json({ success: true });
}

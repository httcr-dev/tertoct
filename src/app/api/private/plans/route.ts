import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const createPlanSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().finite().min(0),
  classesPerWeek: z.number().int().min(1).max(14),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) return forbidden;

  const { data, errorResponse } = await validateBody(req, createPlanSchema);
  if (errorResponse) return errorResponse;
  if (!data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await getAdminFirestore().collection("plans").add({
    name: data.name,
    price: data.price,
    classesPerWeek: data.classesPerWeek,
    description: data.description ?? "",
    active: data.active ?? true,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}

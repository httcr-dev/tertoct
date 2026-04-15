import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const createFeedbackSchema = z.object({
  message: z.string().trim().min(1).max(64),
  userName: z.string().max(120).nullable().optional(),
});

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["student"]);
  if (forbidden) return forbidden;

  const { data, errorResponse } = await validateBody(req, createFeedbackSchema);
  if (errorResponse) return errorResponse;
  if (!data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await getAdminFirestore().collection("feedbacks").add({
    userId: auth.context.session.uid,
    userName: data.userName ?? null,
    message: data.message,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}

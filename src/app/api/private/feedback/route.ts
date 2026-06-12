import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { withPrivateMutation } from "@/lib/auth/withPrivateMutation";
import { assertActiveStudentWithPlan } from "@/lib/server/studentEligibility";
import { validateBody } from "@/lib/validations/validateRoute";

export const runtime = "nodejs";

const createFeedbackSchema = z.object({
  message: z.string().trim().min(1).max(64),
  userName: z.string().max(120).nullable().optional(),
});

export async function POST(req: Request) {
  return withPrivateMutation(req, { roles: ["student"] }, async ({ req: request, auth }) => {
    const { data, errorResponse } = await validateBody(request, createFeedbackSchema);
    if (errorResponse) return errorResponse;
    if (!data) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const eligibility = await assertActiveStudentWithPlan(auth.session.uid);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error },
        { status: eligibility.status },
      );
    }

    await db.collection("feedbacks").add({
      userId: auth.session.uid,
      userName: data.userName ?? null,
      message: data.message,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  });
}

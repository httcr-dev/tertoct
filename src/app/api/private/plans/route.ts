import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";
import { withPrivateMutation } from "@/lib/auth/withPrivateMutation";
import { validateBody } from "@/lib/validations/validateRoute";
import { PlanCreateApiSchema } from "@/lib/validations/plan";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withPrivateMutation(req, { roles: ["coach", "admin"] }, async ({ req: request }) => {
    const { data, errorResponse } = await validateBody(request, PlanCreateApiSchema);
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
  });
}

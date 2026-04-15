import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import { startOfWeek } from "@/lib/utils/date";

export const runtime = "nodejs";

const createCheckinSchema = z.object({
  planId: z.string().trim().min(1),
});

function getWeekKey(date = new Date()): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["student"]);
  if (forbidden) return forbidden;

  const { data, errorResponse } = await validateBody(req, createCheckinSchema);
  if (errorResponse) return errorResponse;
  if (!data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const userId = auth.context.session.uid;
  const planId = data.planId;
  const db = getAdminFirestore();
  const weekKey = getWeekKey();
  const counterId = `${userId}_${weekKey}`;

  await db.runTransaction(async (tx) => {
    const userRef = db.collection("users").doc(userId);
    const planRef = db.collection("plans").doc(planId);
    const counterRef = db.collection("checkinCounters").doc(counterId);
    const checkinsRef = db.collection("checkins").doc();
    const [userSnap, planSnap, counterSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(planRef),
      tx.get(counterRef),
    ]);

    if (!userSnap.exists || !planSnap.exists) {
      throw new Error("Invalid user or plan");
    }

    const user = userSnap.data() ?? {};
    const plan = planSnap.data() ?? {};
    if (user.planId !== planId || plan.active !== true) {
      throw new Error("Plan is not valid for this user");
    }

    const currentCount =
      counterSnap.exists && typeof counterSnap.data()?.count === "number"
        ? Number(counterSnap.data()?.count)
        : 0;
    const allowed =
      typeof plan.classesPerWeek === "number" ? Number(plan.classesPerWeek) : 0;
    if (currentCount >= allowed) {
      throw new Error("Weekly check-in limit reached");
    }

    tx.set(
      counterRef,
      {
        userId,
        weekKey,
        count: currentCount + 1,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    tx.set(checkinsRef, {
      userId,
      planId,
      weekKey,
      createdAt: new Date(),
    });
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign-plan"),
    planId: z.string().trim().min(1).nullable(),
  }),
  z.object({
    action: z.literal("set-payment-day"),
    day: z.number().int().min(1).max(31).nullable(),
  }),
  z.object({
    action: z.literal("toggle-payment"),
  }),
  z.object({
    action: z.literal("toggle-active"),
  }),
  z.object({
    action: z.literal("update-phone"),
    phone: z.string().trim().max(40).nullable(),
  }),
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) {
    console.warn("[users PATCH] 403 Forbidden. User context:", auth.context);
    return forbidden;
  }

  const { userId } = await params;
  const { data, errorResponse } = await validateBody(req, payloadSchema);
  if (errorResponse) return errorResponse;
  if (!data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ref = getAdminFirestore().collection("users").doc(userId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const current = snap.data() ?? {};

  if (data.action === "assign-plan") {
    if (data.planId === null) {
      await ref.update({
        planId: null,
        paymentValidUntil: null,
        monthlyPaymentPaid: null,
        paymentDueDay: null,
        active: false,
      });
      return NextResponse.json({ success: true });
    }

    await ref.update({
      planId: data.planId,
      active: true,
    });
    return NextResponse.json({ success: true });
  }

  if (data.action === "set-payment-day") {
    await ref.update({
      paymentDueDay: data.day,
      ...(data.day === null ? { monthlyPaymentPaid: null } : {}),
    });
    return NextResponse.json({ success: true });
  }

  if (data.action === "toggle-payment") {
    const now = new Date();
    const paymentValidUntil = current.paymentValidUntil?.toDate?.();
    const isPaid = paymentValidUntil
      ? now.getTime() <= paymentValidUntil.getTime()
      : current.monthlyPaymentPaid === true;

    if (isPaid) {
      await ref.update({
        monthlyPaymentPaid: false,
        paymentValidUntil: null,
      });
      return NextResponse.json({ success: true });
    }

    let targetMonth = now.getMonth() + 1;
    let targetYear = now.getFullYear();
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const dueDay =
      typeof current.paymentDueDay === "number" ? current.paymentDueDay : 10;
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const day = Math.min(dueDay, lastDay);
    const validUntil = new Date(targetYear, targetMonth, day, 23, 59, 59, 999);

    await ref.update({
      monthlyPaymentPaid: true,
      paymentValidUntil: validUntil,
    });
    return NextResponse.json({ success: true });
  }

  if (data.action === "toggle-active") {
    const isCurrentlyActive = current.active !== false;
    const newActive = !isCurrentlyActive;
    await ref.update({ active: newActive });
    
    if (current.role === "coach" || current.role === "admin") {
      await getAdminFirestore()
        .collection("publicProfiles")
        .doc(userId)
        .set({ active: newActive }, { merge: true });
    }
    
    return NextResponse.json({ success: true });
  }

  await ref.update({ phone: data.phone || null });
  return NextResponse.json({ success: true });
}

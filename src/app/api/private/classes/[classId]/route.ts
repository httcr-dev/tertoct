import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import { parseHHmm } from "@/lib/utils/time";

export const runtime = "nodejs";

const updateClassSchema = z.object({
  name: z.string().trim().min(1).optional(),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
  checkinDeadlineTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
  capacity: z.number().int().min(1).max(200).optional(),
  utcOffsetMinutes: z.number().int().min(-12 * 60).max(14 * 60).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) return forbidden;

  const rateLimited = await enforcePrivateApiRateLimit(req, auth.context.session.uid);
  if (rateLimited) return rateLimited;

  const { classId } = await params;
  const { data, errorResponse } = await validateBody(req, updateClassSchema);
  if (errorResponse) return errorResponse;
  if (!data) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const db = getAdminFirestore();
  const ref = db.collection("classes").doc(classId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const current = snap.data() ?? {};

  const next = {
    ...current,
    ...data,
  } as Record<string, unknown>;

  const startMinutes = parseHHmm(String(next.startTime ?? ""));
  const deadlineMinutes = parseHHmm(String(next.checkinDeadlineTime ?? ""));
  if (startMinutes == null || deadlineMinutes == null || deadlineMinutes >= startMinutes) {
    return NextResponse.json(
      { error: "Invalid class times (deadline must be before start)" },
      { status: 400 },
    );
  }

  await ref.set(
    {
      ...data,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) return forbidden;

  const rateLimited = await enforcePrivateApiRateLimit(req, auth.context.session.uid);
  if (rateLimited) return rateLimited;

  const { classId } = await params;
  const db = getAdminFirestore();

  // Soft-delete via active=false to preserve history.
  await db.collection("classes").doc(classId).set(
    {
      active: false,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  return NextResponse.json({ success: true });
}


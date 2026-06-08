import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import { getPrivateRouteContextFromRequest, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import { parseHHmm } from "@/lib/utils/time";

export const runtime = "nodejs";

const createClassSchema = z.object({
  name: z.string().trim().min(1),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
  checkinDeadlineTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(1).max(200),
  utcOffsetMinutes: z.number().int().min(-12 * 60).max(14 * 60).default(-180),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContextFromRequest(req);
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) return forbidden;

  const rateLimited = await enforcePrivateApiRateLimit(req, auth.context.session.uid);
  if (rateLimited) return rateLimited;

  const { data, errorResponse } = await validateBody(req, createClassSchema);
  if (errorResponse) return errorResponse;
  if (!data) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const startMinutes = parseHHmm(data.startTime);
  const deadlineMinutes = parseHHmm(data.checkinDeadlineTime);
  if (startMinutes == null || deadlineMinutes == null || deadlineMinutes >= startMinutes) {
    return NextResponse.json(
      { error: "Invalid class times (deadline must be before start)" },
      { status: 400 },
    );
  }

  const db = getAdminFirestore();
  const docRef = db.collection("classes").doc();
  await docRef.set({
    name: data.name,
    startTime: data.startTime,
    checkinDeadlineTime: data.checkinDeadlineTime,
    capacity: data.capacity,
    utcOffsetMinutes: data.utcOffsetMinutes,
    active: data.active ?? true,
    createdBy: auth.context.session.uid,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true, id: docRef.id });
}


import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import { canCancelCheckIn } from "@/lib/utils/checkinCancel";
import { parseHHmm } from "@/lib/utils/time";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ checkinId: string }> };

export async function DELETE(req: Request, context: RouteContext) {
  if (!isTrustedMutationRequest(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["student"]);
  if (forbidden) return forbidden;

  const rateLimited = await enforcePrivateApiRateLimit(
    req,
    auth.context.session.uid,
  );
  if (rateLimited) return rateLimited;

  const { checkinId } = await context.params;
  if (!checkinId?.trim()) {
    return NextResponse.json({ error: "Check-in inválido." }, { status: 400 });
  }

  const userId = auth.context.session.uid;
  const db = getAdminFirestore();

  try {
    await db.runTransaction(async (tx) => {
      const checkinsRef = db.collection("checkins").doc(checkinId);
      const checkinSnap = await tx.get(checkinsRef);

      if (!checkinSnap.exists) {
        throw new Error("Check-in não encontrado.");
      }

      const checkin = checkinSnap.data() ?? {};
      if (checkin.userId !== userId) {
        throw new Error("Você não pode cancelar este check-in.");
      }

      const classId = String(checkin.classId ?? "");
      const classDateKey = String(checkin.classDateKey ?? "");
      const weekKey = String(checkin.weekKey ?? "");

      if (!classId || !classDateKey || !weekKey) {
        throw new Error("Dados do check-in incompletos.");
      }

      const classRef = db.collection("classes").doc(classId);
      const classSnap = await tx.get(classRef);
      const gymClass = classSnap.exists ? (classSnap.data() ?? {}) : {};

      const utcOffsetMinutes =
        typeof gymClass.utcOffsetMinutes === "number"
          ? Number(gymClass.utcOffsetMinutes)
          : -180;
      const startTime = String(
        checkin.classStartTime ?? gymClass.startTime ?? "",
      );
      const startMinutes = parseHHmm(startTime);

      const timingForCancel = {
        startTime,
        utcOffsetMinutes,
      };

      const checkInForPolicy = {
        id: checkinId,
        userId,
        planId: String(checkin.planId ?? ""),
        classId,
        classDateKey,
        className: (checkin.className as string | null | undefined) ?? null,
        classStartTime: startTime || null,
        createdAt: checkin.createdAt?.toDate?.() ?? new Date(),
      };

      if (
        startMinutes == null ||
        !canCancelCheckIn(checkInForPolicy, timingForCancel)
      ) {
        throw new Error(
          "Cancelamento permitido apenas até 1 hora antes do início da turma.",
        );
      }

      const counterId = `${userId}_${weekKey}`;
      const counterRef = db.collection("checkinCounters").doc(counterId);
      const classCounterId = `${classId}_${classDateKey}`;
      const classCounterRef = db
        .collection("classCheckinCounters")
        .doc(classCounterId);

      const [counterSnap, classCounterSnap] = await Promise.all([
        tx.get(counterRef),
        tx.get(classCounterRef),
      ]);

      const currentCount =
        counterSnap.exists && typeof counterSnap.data()?.count === "number"
          ? Number(counterSnap.data()?.count)
          : 0;
      const currentClassCount =
        classCounterSnap.exists &&
        typeof classCounterSnap.data()?.count === "number"
          ? Number(classCounterSnap.data()?.count)
          : 0;

      tx.delete(checkinsRef);

      if (currentCount > 0) {
        tx.set(
          counterRef,
          {
            userId,
            weekKey,
            count: currentCount - 1,
            updatedAt: new Date(),
          },
          { merge: true },
        );
      }

      if (currentClassCount > 0) {
        tx.set(
          classCounterRef,
          {
            classId,
            classDateKey,
            count: currentClassCount - 1,
            updatedAt: new Date(),
          },
          { merge: true },
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Falha ao cancelar check-in.";
    const status = msg.includes("não encontrado") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

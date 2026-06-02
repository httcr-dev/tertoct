import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/auth/admin";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { validateBody } from "@/lib/validations/validateRoute";
import { isTrustedMutationRequest } from "@/lib/security/origin";
import { startOfWeek } from "@/lib/utils/date";
import { parseHHmm } from "@/lib/utils/time";
import { getDateKeyForOffset, utcDateAtLocalTime } from "@/lib/utils/dateKey";
import { isPaymentOverdue } from "@/lib/utils/payment";
import type { AppUserProfile } from "@/lib/types";

export const runtime = "nodejs";

const createCheckinSchema = z.object({
  planId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  classDateKey: z.string().trim().optional(), // YYYY-MM-DD format
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

  const rateLimited = await enforcePrivateApiRateLimit(req, auth.context.session.uid);
  if (rateLimited) return rateLimited;

  const { data, errorResponse } = await validateBody(req, createCheckinSchema);
  if (errorResponse) return errorResponse;
  if (!data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const userId = auth.context.session.uid;
  const planId = data.planId;
  const classId = data.classId;
  const providedClassDateKey = data.classDateKey;
  const db = getAdminFirestore();
  const weekKey = getWeekKey();
  const counterId = `${userId}_${weekKey}`;

  try {
    await db.runTransaction(async (tx) => {
      const userRef = db.collection("users").doc(userId);
      const planRef = db.collection("plans").doc(planId);
      const counterRef = db.collection("checkinCounters").doc(counterId);
      const classRef = db.collection("classes").doc(classId);
      const [userSnap, planSnap, counterSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(planRef),
        tx.get(counterRef),
      ]);
      const classSnap = await tx.get(classRef);

      if (!userSnap.exists || !planSnap.exists || !classSnap.exists) {
        throw new Error("Usuário, plano ou turma inválidos.");
      }

      const user = userSnap.data() ?? {};
      const plan = planSnap.data() ?? {};
      if (user.planId !== planId || plan.active !== true) {
        throw new Error("Seu plano não está válido para este check-in.");
      }

      const paymentProfile: AppUserProfile = {
        id: userId,
        name: (user.name as string | null | undefined) ?? null,
        email: (user.email as string | null | undefined) ?? null,
        role: "student",
        active: user.active !== false,
        paymentDueDay:
          typeof user.paymentDueDay === "number" ? user.paymentDueDay : null,
        monthlyPaymentPaid: user.monthlyPaymentPaid as boolean | undefined,
        paymentValidUntil: user.paymentValidUntil ?? null,
      };
      if (isPaymentOverdue(paymentProfile)) {
        throw new Error(
          "Mensalidade pendente. Regularize seu pagamento para fazer check-in.",
        );
      }

      const gymClass = classSnap.data() ?? {};
      if (gymClass.active !== true) {
        throw new Error("Esta turma está desativada.");
      }

      // Fixed São Paulo offset (UTC-3). Keep legacy field fallback.
      const utcOffsetMinutes =
        typeof gymClass.utcOffsetMinutes === "number"
          ? Number(gymClass.utcOffsetMinutes)
          : -180;
      const startTime = String(gymClass.startTime ?? "");
      const deadlineTime = String(gymClass.checkinDeadlineTime ?? "");
      const startMinutes = parseHHmm(startTime);
      const deadlineMinutes = parseHHmm(deadlineTime);
      const capacity =
        typeof gymClass.capacity === "number" ? Number(gymClass.capacity) : 0;

      if (startMinutes == null || deadlineMinutes == null || capacity <= 0) {
        throw new Error("Configuração da turma inválida.");
      }
      if (deadlineMinutes >= startMinutes) {
        throw new Error("O horário máximo de check-in deve ser antes do início.");
      }

      const now = new Date();
      const todayDateKey = getDateKeyForOffset(now, utcOffsetMinutes);
      const classDateKey = providedClassDateKey || todayDateKey;
      
      // Validate date format if provided
      if (providedClassDateKey && !/^\d{4}-\d{2}-\d{2}$/.test(providedClassDateKey)) {
        throw new Error("Formato de data inválido. Use YYYY-MM-DD.");
      }
      
      const deadlineAt = utcDateAtLocalTime(
        classDateKey,
        deadlineMinutes,
        utcOffsetMinutes,
      );
      const startAt = utcDateAtLocalTime(
        classDateKey,
        startMinutes,
        utcOffsetMinutes,
      );

      if (!(deadlineAt instanceof Date) || Number.isNaN(deadlineAt.getTime())) {
        throw new Error("Horário de check-in inválido.");
      }
      
      // Only check deadline if it's for today's class
      const isToday = classDateKey === todayDateKey;
      if (isToday && now.getTime() > deadlineAt.getTime()) {
        throw new Error("Check-in encerrado para esta turma (passou do horário).");
      }
      
      // Don't allow checkins for past dates
      if (classDateKey < todayDateKey) {
        throw new Error("Não é possível fazer check-in para datas passadas.");
      }

      // Enforce one check-in per (user, class, date) with deterministic id.
      const checkinId = `${userId}_${classId}_${classDateKey}`;
      const checkinsRef = db.collection("checkins").doc(checkinId);
      const existing = await tx.get(checkinsRef);
      if (existing.exists) {
        throw new Error("Você já fez check-in nesta turma hoje.");
      }

      // Capacity counter per class per day
      const classCounterId = `${classId}_${classDateKey}`;
      const classCounterRef = db
        .collection("classCheckinCounters")
        .doc(classCounterId);
      const classCounterSnap = await tx.get(classCounterRef);
      const currentClassCount =
        classCounterSnap.exists &&
        typeof classCounterSnap.data()?.count === "number"
          ? Number(classCounterSnap.data()?.count)
          : 0;
      if (currentClassCount >= capacity) {
        throw new Error("Turma lotada (sem vagas disponíveis).");
      }

      const currentCount =
        counterSnap.exists && typeof counterSnap.data()?.count === "number"
          ? Number(counterSnap.data()?.count)
          : 0;
      const allowed =
        typeof plan.classesPerWeek === "number" ? Number(plan.classesPerWeek) : 0;
      if (currentCount >= allowed) {
        throw new Error("Você atingiu o limite de check-ins desta semana.");
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
      tx.set(
        classCounterRef,
        {
          classId,
          classDateKey,
          count: currentClassCount + 1,
          updatedAt: new Date(),
        },
        { merge: true },
      );
      tx.set(checkinsRef, {
        userId,
        planId,
        classId,
        classDateKey,
        className: (gymClass.name as string | undefined) ?? "Turma",
        classStartTime: startTime,
        classStartAt: startAt,
        classCheckinDeadlineAt: deadlineAt,
        weekKey,
        createdAt: new Date(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha ao realizar check-in.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import type {
  CheckIn,
  Plan,
  AppUserProfile,
  DateLikeTimestamp,
  GymClass,
} from "@/lib/types";
import { toDate } from "@/lib/utils/date";

export function mapPlan(
  docSnap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): Plan {
  const data = (docSnap.data() ?? {}) as DocumentData;

  return {
    id: docSnap.id,
    name: data.name as string,
    price: data.price as number,
    classesPerWeek: data.classesPerWeek as number,
    description: (data.description as string | undefined) ?? undefined,
    active: (data.active as boolean | undefined) ?? true,
  };
}

export function mapCheckin(
  docSnap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): CheckIn {
  const data = (docSnap.data() ?? {}) as DocumentData;

  return {
    id: docSnap.id,
    userId: data.userId as string,
    planId: data.planId as string,
    classId: (data.classId as string | null | undefined) ?? null,
    classDateKey: (data.classDateKey as string | null | undefined) ?? null,
    className: (data.className as string | null | undefined) ?? null,
    classStartTime: (data.classStartTime as string | null | undefined) ?? null,
    createdAt: toDate(data.createdAt) ?? new Date(0),
  };
}

export function mapGymClass(
  docSnap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): GymClass {
  const data = (docSnap.data() ?? {}) as DocumentData;
  return {
    id: docSnap.id,
    name: (data.name as string | undefined) ?? "Turma",
    startTime: (data.startTime as string | undefined) ?? "07:00",
    checkinDeadlineTime:
      (data.checkinDeadlineTime as string | undefined) ?? "06:30",
    capacity: typeof data.capacity === "number" ? Number(data.capacity) : 0,
    utcOffsetMinutes:
      typeof data.utcOffsetMinutes === "number"
        ? Number(data.utcOffsetMinutes)
        : -180,
    active: (data.active as boolean | undefined) ?? true,
    createdBy: (data.createdBy as string | undefined) ?? "unknown",
    createdAt: toDate(data.createdAt),
  };
}

export function mapUserProfile(
  docSnap: DocumentSnapshot<DocumentData>,
): AppUserProfile | null {
  if (!docSnap.exists()) return null;
  const data = docSnap.data() ?? {};

  return {
    id: docSnap.id,
    name: (data.name as string | null | undefined) ?? null,
    email: (data.email as string | null | undefined) ?? null,
    photoURL: (data.photoURL as string | null | undefined) ?? null,
    role: (data.role as AppUserProfile["role"] | undefined) ?? "student",
    planId: (data.planId as string | null | undefined) ?? null,
    active: (data.active as boolean | undefined) ?? true,
    createdAt: toDate(data.createdAt),
    paymentDueDay: (data.paymentDueDay as number | null | undefined) ?? null,
    monthlyPaymentPaid: (data.monthlyPaymentPaid as boolean | undefined) ?? false,
    paymentValidUntil: (data.paymentValidUntil as DateLikeTimestamp | null | undefined) ?? null,
  };
}


import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import type { CheckIn, Plan, AppUserProfile, DateLikeTimestamp } from "@/lib/types";

function toDateMaybe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const ts = value as Timestamp | { seconds?: number; toDate?: () => Date } | undefined;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") {
    return new Date(ts.seconds * 1000);
  }
  return null;
}

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
    createdAt: toDateMaybe(data.createdAt) ?? new Date(0),
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
    createdAt: toDateMaybe(data.createdAt),
    paymentDueDay: (data.paymentDueDay as number | null | undefined) ?? null,
    monthlyPaymentPaid: (data.monthlyPaymentPaid as boolean | undefined) ?? false,
    paymentValidUntil: (data.paymentValidUntil as DateLikeTimestamp | null | undefined) ?? null,
  };
}


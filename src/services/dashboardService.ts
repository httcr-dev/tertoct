import {
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { CheckIn, Plan, StudentSummary } from "@/lib/types";
import { mapCheckin, mapPlan } from "@/lib/firestore/mappers";
import { checkinsCol, plansCol, usersCol } from "@/lib/firestore/refs";

export function listenPlans(onData: (plans: Plan[]) => void): Unsubscribe {
  return onSnapshot(query(plansCol(), orderBy("name", "asc")), (snap) => {
    onData(snap.docs.map(mapPlan));
  });
}

export function listenStudents(onData: (students: StudentSummary[]) => void): Unsubscribe {
  return onSnapshot(query(usersCol(), where("role", "==", "student")), (snap) => {
    const next: StudentSummary[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name ?? null,
        email: data.email ?? null,
        photoURL: data.photoURL ?? null,
        planId: data.planId ?? null,
        weeklyCheckIns: 0,
        paymentDueDay: data.paymentDueDay ?? null,
        monthlyPaymentPaid: data.monthlyPaymentPaid ?? false,
        paymentValidUntil: data.paymentValidUntil ?? null,
        ...(data.active !== undefined ? { active: !!data.active } : {}),
      };
    });
    onData(next);
  });
}

export function listenCoaches(onData: (coaches: StudentSummary[]) => void): Unsubscribe {
  return onSnapshot(query(usersCol(), where("role", "==", "coach")), (snap) => {
    const next: StudentSummary[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name ?? null,
        email: data.email ?? null,
        photoURL: data.photoURL ?? null,
        weeklyCheckIns: 0,
        ...(data.active !== undefined ? { active: !!data.active } : {}),
      };
    });
    onData(next);
  });
}

export function listenCheckinCountsSince(
  since: Date,
  onData: (counts: Map<string, number>) => void,
): Unsubscribe {
  return onSnapshot(
    query(checkinsCol(), where("createdAt", ">=", Timestamp.fromDate(since))),
    (snap) => {
      const counts = new Map<string, number>();
      snap.forEach((d) => {
        const uid = d.data().userId;
        if (uid) counts.set(uid, (counts.get(uid) ?? 0) + 1);
      });
      onData(counts);
    },
  );
}

export async function fetchRecentCheckinsSince(since: Date): Promise<CheckIn[]> {
  const snap = await getDocs(
    query(
      checkinsCol(),
      where("createdAt", ">=", Timestamp.fromDate(since)),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map(mapCheckin);
}


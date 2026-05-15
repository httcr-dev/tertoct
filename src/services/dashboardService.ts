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
import { checkinsCol, plansCol, publicProfilesCol, usersCol } from "@/lib/firestore/refs";

type SnapshotErrorHandler = (error: unknown) => void;

export function listenPlans(
  onData: (plans: Plan[]) => void,
  onError?: SnapshotErrorHandler,
): Unsubscribe {
  return onSnapshot(
    query(plansCol(), orderBy("name", "asc")),
    (snap) => {
      onData(snap.docs.map(mapPlan));
    },
    onError,
  );
}

export function listenStudents(
  onData: (students: StudentSummary[]) => void,
  onError?: SnapshotErrorHandler,
): Unsubscribe {
  return onSnapshot(
    query(usersCol(), where("role", "==", "student")),
    (snap) => {
      const next: StudentSummary[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
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
    },
    onError,
  );
}

export function listenCoaches(
  onData: (coaches: StudentSummary[]) => void,
  onError?: SnapshotErrorHandler,
): Unsubscribe {
  return onSnapshot(
    query(publicProfilesCol(), where("role", "in", ["coach", "admin"])),
    (snap) => {
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
    },
    onError,
  );
}

export function listenCheckinCountsSince(
  since: Date,
  onData: (counts: Map<string, number>) => void,
  onError?: SnapshotErrorHandler,
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
    onError,
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

/**
 * Fetches check-ins within a specific date range based on createdAt
 */
export async function fetchCheckinsByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<CheckIn[]> {
  const snap = await getDocs(
    query(
      checkinsCol(),
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      where("createdAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map(mapCheckin);
}

/**
 * Fetches check-ins for specific date keys (useful for business week filtering)
 * Note: Firestore 'in' query has a limit of 10 values, so we batch if needed
 */
export async function fetchCheckinsByDateKeys(
  dateKeys: string[],
): Promise<CheckIn[]> {
  if (dateKeys.length === 0) return [];
  
  // If we have 5 or fewer keys, use single query
  if (dateKeys.length <= 5) {
    const snap = await getDocs(
      query(
        checkinsCol(),
        where("classDateKey", "in", dateKeys),
        orderBy("createdAt", "desc"),
      ),
    );
    return snap.docs.map(mapCheckin);
  }
  
  // For more than 5 keys, batch the queries
  const allCheckins: CheckIn[] = [];
  for (let i = 0; i < dateKeys.length; i += 5) {
    const batch = dateKeys.slice(i, i + 5);
    const snap = await getDocs(
      query(
        checkinsCol(),
        where("classDateKey", "in", batch),
        orderBy("createdAt", "desc"),
      ),
    );
    allCheckins.push(...snap.docs.map(mapCheckin));
  }
  
  // Sort by createdAt descending
  allCheckins.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return allCheckins;
}

/**
 * Fetches all check-ins for the current business week (Monday to Friday)
 */
export async function fetchCurrentWeekCheckins(): Promise<CheckIn[]> {
  // Get all check-ins from the last 7 days to ensure we catch all relevant ones
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const snap = await getDocs(
    query(
      checkinsCol(),
      where("createdAt", ">=", Timestamp.fromDate(weekAgo)),
      orderBy("createdAt", "desc"),
    ),
  );
  
  return snap.docs.map(mapCheckin);
}

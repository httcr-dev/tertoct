import {
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { CheckIn, Plan, StudentSummary } from "@/lib/types";
import { mapPlan, mapStudentSummary } from "@/lib/firestore/mappers";
import { plansCol, publicProfilesCol, usersCol } from "@/lib/firestore/refs";

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
      onData(snap.docs.map((docSnap) => mapStudentSummary(docSnap)));
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

const COACH_COUNTS_POLL_MS = 120_000;

/** Coach dashboard: 30-day check-in counts via private API (no client listener on all checkins). */
export async function fetchCheckinCountsByCoach(
  days = 30,
): Promise<Map<string, number>> {
  const response = await fetch(
    `/api/private/checkins/counts?days=${encodeURIComponent(String(days))}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("Failed to load check-in counts");
  }
  const body = (await response.json()) as { counts?: Record<string, number> };
  const map = new Map<string, number>();
  if (body.counts) {
    for (const [userId, count] of Object.entries(body.counts)) {
      map.set(userId, count);
    }
  }
  return map;
}

export function getCoachCheckinCountsPollIntervalMs(): number {
  return COACH_COUNTS_POLL_MS;
}

type CoachCheckinsQuery = {
  since?: Date;
  days?: number;
  classDateKeys?: string[];
};

async function fetchCoachCheckinsFromApi(
  query: CoachCheckinsQuery,
): Promise<CheckIn[]> {
  const params = new URLSearchParams();
  if (query.since) {
    params.set("since", query.since.toISOString());
  } else if (query.days != null) {
    params.set("days", String(query.days));
  }
  if (query.classDateKeys && query.classDateKeys.length > 0) {
    params.set("classDateKeys", query.classDateKeys.join(","));
  }

  const response = await fetch(
    `/api/private/checkins/recent?${params.toString()}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("Failed to load check-ins");
  }
  const body = (await response.json()) as {
    checkins?: Array<CheckIn & { createdAt: string }>;
  };
  if (!Array.isArray(body.checkins)) return [];
  return body.checkins.map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt),
  }));
}

/** Coach dashboard: check-ins since `since` via private API. */
export async function fetchRecentCheckinsSince(since: Date): Promise<CheckIn[]> {
  return fetchCoachCheckinsFromApi({ since });
}

/** Coach dashboard: current business week check-ins via private API. */
export async function fetchCurrentWeekCheckins(
  classDateKeys: string[],
): Promise<CheckIn[]> {
  return fetchCoachCheckinsFromApi({
    days: 7,
    classDateKeys,
  });
}

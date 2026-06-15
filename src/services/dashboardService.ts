import {
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { CheckIn, Plan, StudentSummary } from "@/lib/types";
import { mapPlan } from "@/lib/firestore/mappers";
import { plansCol, publicProfilesCol } from "@/lib/firestore/refs";

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
const COACH_STUDENTS_POLL_MS = 60_000;

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

export function getCoachStudentsPollIntervalMs(): number {
  return COACH_STUDENTS_POLL_MS;
}

type StudentsPageResponse = {
  students?: StudentSummary[];
  nextCursor?: string | null;
};

/** Coach dashboard: paginated students via private API. */
export async function fetchStudentsForCoach(options?: {
  limit?: number;
  cursor?: string;
}): Promise<StudentsPageResponse> {
  const params = new URLSearchParams();
  if (options?.limit != null) {
    params.set("limit", String(options.limit));
  }
  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }
  const qs = params.toString();
  const response = await fetch(
    `/api/private/users/students${qs ? `?${qs}` : ""}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("Failed to load students");
  }
  return (await response.json()) as StudentsPageResponse;
}

/** Loads all student pages for coach dashboards. */
export async function fetchAllStudentsForCoach(): Promise<StudentSummary[]> {
  const all: StudentSummary[] = [];
  let cursor: string | undefined;

  do {
    const page = await fetchStudentsForCoach({ limit: 100, cursor });
    if (Array.isArray(page.students)) {
      all.push(...page.students);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return all;
}

type CoachCheckinsQuery = {
  since?: Date;
  days?: number;
  classDateKeys?: string[];
  classDateKeyFrom?: string;
  classDateKeyTo?: string;
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
  if (query.classDateKeyFrom && query.classDateKeyTo) {
    params.set("fromDateKey", query.classDateKeyFrom);
    params.set("toDateKey", query.classDateKeyTo);
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

/** Coach check-in history for a week/month period. */
export async function fetchCheckinsForHistoryPeriod(
  query: Pick<
    CoachCheckinsQuery,
    "classDateKeys" | "classDateKeyFrom" | "classDateKeyTo"
  >,
): Promise<CheckIn[]> {
  return fetchCoachCheckinsFromApi(query);
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

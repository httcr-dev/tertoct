import {
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  limit,
  type Unsubscribe,
  where,
} from "firebase/firestore";
import type { CheckIn } from "@/lib/types";
import { checkinsCol } from "@/lib/firestore/refs";
import { mapCheckin } from "@/lib/firestore/mappers";
import { parseApiErrorMessage } from "@/lib/utils/parseApiError";

export async function cancelCheckIn(checkinId: string): Promise<void> {
  const response = await fetch(
    `/api/private/checkins/${encodeURIComponent(checkinId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao cancelar check-in"));
  }
}

export async function createCheckIn(
  _userId: string,
  planId: string,
  classId: string,
  classDateKey?: string,
): Promise<void> {
  const body: { planId: string; classId: string; classDateKey?: string } = {
    planId,
    classId,
  };
  
  if (classDateKey) {
    body.classDateKey = classDateKey;
  }
  
  const response = await fetch("/api/private/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha no check-in"));
  }
}

const HISTORY_FETCH_CAP = 50;

export async function fetchCheckinsByUser(
  userId: string,
  options?: { lastDays?: number },
): Promise<CheckIn[]> {
  if (options?.lastDays != null) {
    const since = new Date(
      Date.now() - options.lastDays * 24 * 60 * 60 * 1000,
    );
    const q = query(
      checkinsCol(),
      where("userId", "==", userId),
      where("createdAt", ">=", Timestamp.fromDate(since)),
      orderBy("createdAt", "desc"),
      limit(HISTORY_FETCH_CAP),
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapCheckin);
  }

  const snap = await getDocs(
    query(
      checkinsCol(),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(HISTORY_FETCH_CAP),
    ),
  );
  return snap.docs.map(mapCheckin);
}

export function listenCheckinsByUser(
  userId: string,
  onData: (checkins: CheckIn[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    checkinsCol(),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(HISTORY_FETCH_CAP),
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map(mapCheckin));
    },
    onError,
  );
}


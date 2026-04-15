import {
  getDocs,
  onSnapshot,
  query,
  type Unsubscribe,
  where,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import type { CheckIn } from "@/lib/types";
import { checkinsCol } from "@/lib/firestore/refs";
import { mapCheckin } from "@/lib/firestore/mappers";

export async function createCheckIn(
  _userId: string,
  planId: string,
): Promise<void> {
  const response = await fetch("/api/private/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  if (!response.ok) {
    throw new Error("Check-in failed");
  }
}

export async function fetchCheckinsByUser(
  userId: string,
  options?: { lastDays?: number },
): Promise<CheckIn[]> {
  const q = query(checkinsCol(), where("userId", "==", userId));
  const snap = await getDocs(q);
  const history: CheckIn[] = [];
  const maybeSnap = snap as Partial<QuerySnapshot<DocumentData>>;
  if (Array.isArray(maybeSnap.docs)) {
    history.push(...maybeSnap.docs.map(mapCheckin));
  } else if (typeof maybeSnap.forEach === "function") {
    maybeSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      history.push(mapCheckin(d));
    });
  }
  // Sort locally to avoid needing a composite index
  history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.lastDays != null) {
    const since = Date.now() - options.lastDays * 24 * 60 * 60 * 1000;
    return history.filter((c) => c.createdAt.getTime() >= since);
  }
  return history;
}

export function listenCheckinsByUser(
  userId: string,
  onData: (checkins: CheckIn[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(checkinsCol(), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snap) => {
      const next = snap.docs.map(mapCheckin);
      next.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(next);
    },
    onError,
  );
}


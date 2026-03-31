import {
  addDoc,
  getDocs,
  onSnapshot,
  query,
  type Unsubscribe,
  where,
  serverTimestamp,
} from "firebase/firestore";
import type { CheckIn } from "@/lib/types";
import { checkinsCol } from "@/lib/firestore/refs";
import { mapCheckin } from "@/lib/firestore/mappers";

export async function createCheckIn(
  userId: string,
  planId: string,
): Promise<void> {
  await addDoc(checkinsCol(), {
    userId,
    planId,
    createdAt: serverTimestamp(),
  });
}

export async function fetchCheckinsByUser(
  userId: string,
  options?: { lastDays?: number },
): Promise<CheckIn[]> {
  const q = query(checkinsCol(), where("userId", "==", userId));
  const snap = await getDocs(q);
  const history: CheckIn[] = [];
  if ("docs" in snap && Array.isArray((snap as any).docs)) {
    history.push(...(snap as any).docs.map(mapCheckin));
  } else if ("forEach" in snap && typeof (snap as any).forEach === "function") {
    (snap as any).forEach((d: any) => {
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


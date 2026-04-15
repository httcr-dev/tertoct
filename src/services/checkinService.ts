import {
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  type Unsubscribe,
  where,
  serverTimestamp,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import type { CheckIn } from "@/lib/types";
import { checkinCounterDoc, checkinsCol, planDoc, userDoc } from "@/lib/firestore/refs";
import { mapCheckin } from "@/lib/firestore/mappers";
import { getFirestoreDb } from "@/lib/firebase";
import { startOfWeek } from "@/lib/utils/date";

function getWeekKey(date = new Date()): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

export async function createCheckIn(
  userId: string,
  planId: string,
): Promise<void> {
  const db = getFirestoreDb();
  const weekKey = getWeekKey();
  const counterId = `${userId}_${weekKey}`;

  await runTransaction(db, async (tx) => {
    const [userSnap, planSnap, counterSnap] = await Promise.all([
      tx.get(userDoc(userId)),
      tx.get(planDoc(planId)),
      tx.get(checkinCounterDoc(counterId)),
    ]);

    if (!userSnap.exists() || !planSnap.exists()) {
      throw new Error("Invalid user or plan");
    }

    const user = userSnap.data();
    const plan = planSnap.data();

    if (user.planId !== planId || plan.active !== true) {
      throw new Error("Plan is not valid for this user");
    }

    const currentCount =
      counterSnap.exists() && typeof counterSnap.data().count === "number"
        ? counterSnap.data().count
        : 0;
    const allowed = typeof plan.classesPerWeek === "number" ? plan.classesPerWeek : 0;

    if (currentCount >= allowed) {
      throw new Error("Weekly check-in limit reached");
    }

    const checkinRef = doc(checkinsCol());

    tx.set(
      checkinCounterDoc(counterId),
      {
        userId,
        weekKey,
        count: currentCount + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(checkinRef, {
      userId,
      planId,
      weekKey,
      createdAt: serverTimestamp(),
    });
  });
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


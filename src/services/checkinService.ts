import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { toDate } from "@/lib/utils/date";

const CHECKINS_COLLECTION = "checkins";

function checkinsRef() {
  return collection(getFirestoreDb(), CHECKINS_COLLECTION);
}

export async function createCheckIn(
  userId: string,
  planId: string,
): Promise<void> {
  await addDoc(checkinsRef(), {
    userId,
    planId,
    createdAt: serverTimestamp(),
  });
}

export async function fetchCheckinsByUser(
  userId: string,
): Promise<Array<{ id: string; [key: string]: unknown }>> {
  const q = query(checkinsRef(), where("userId", "==", userId));
  const snap = await getDocs(q);
  const history: Array<{ id: string; [key: string]: unknown }> = [];
  snap.forEach((d) => {
    history.push({ id: d.id, ...d.data() });
  });
  // Sort locally to avoid needing a composite index
  history.sort((a, b) => {
    const dateA = toDate(a.createdAt)?.getTime() ?? 0;
    const dateB = toDate(b.createdAt)?.getTime() ?? 0;
    return dateB - dateA;
  });
  return history;
}


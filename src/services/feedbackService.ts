import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

export interface Feedback {
  id: string;
  userId: string;
  userName: string | null;
  message: string;
  createdAt?: Timestamp;
}

function feedbacksCol() {
  return collection(getFirestoreDb(), "feedbacks");
}

// Note: keep these helpers simple; rules enforce auth/limits.
export async function createFeedback(params: {
  userId: string;
  userName: string | null;
  message: string;
}): Promise<void> {
  const message = params.message.trim().slice(0, 64);
  if (!message) return;

  const response = await fetch("/api/private/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      userName: params.userName ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to create feedback");
  }
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  const response = await fetch(`/api/private/feedback/${feedbackId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete feedback");
  }
}

export function listenMyFeedbacks(
  userId: string,
  onData: (items: Feedback[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(feedbacksCol(), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Feedback[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Feedback, "id">),
      }));
      items.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
        const tb = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
        return tb - ta;
      });
      onData(items);
    },
    onError,
  );
}

export function listenPublicFeedbacks(
  onData: (items: Feedback[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(
    feedbacksCol(),
    orderBy("createdAt", "desc"),
    limit(30),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: Feedback[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Feedback, "id">),
      }));
      onData(items);
    },
    onError,
  );
}


import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { parseApiErrorMessage } from "@/lib/utils/parseApiError";

export interface Feedback {
  id: string;
  userId: string;
  userName: string | null;
  message: string;
  createdAt?: Timestamp;
}

export type PublicFeedbackItem = {
  id: string;
  userName: string | null;
  message: string;
  createdAtMs: number | null;
};

export async function fetchPublicFeedbacks(): Promise<PublicFeedbackItem[]> {
  const res = await fetch("/api/public/feedbacks", { cache: "no-store" });
  if (!res.ok) return [];
  const body = (await res.json()) as { items?: PublicFeedbackItem[] };
  return Array.isArray(body.items) ? body.items : [];
}

function feedbacksCol() {
  return collection(getFirestoreDb(), "feedbacks");
}

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
    throw new Error(await parseApiErrorMessage(response, "Falha ao enviar feedback"));
  }
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  const response = await fetch(`/api/private/feedback/${feedbackId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao excluir feedback"));
  }
}

export function listenMyFeedbacks(
  userId: string,
  onData: (items: Feedback[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(feedbacksCol(), where("userId", "==", userId), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const items: Feedback[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId as string,
          userName: (data.userName as string | null | undefined) ?? null,
          message: data.message as string,
          createdAt: data.createdAt as Feedback["createdAt"],
        };
      });
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

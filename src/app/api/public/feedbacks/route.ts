import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";

export const runtime = "nodejs";

const PUBLIC_FEEDBACK_LIMIT = 50;

type PublicFeedbackItem = {
  id: string;
  userName: string | null;
  message: string;
  createdAtMs: number | null;
};

export async function GET() {
  try {
    const snap = await getAdminFirestore()
      .collection("feedbacks")
      .orderBy("createdAt", "desc")
      .limit(PUBLIC_FEEDBACK_LIMIT)
      .get();

    const items: PublicFeedbackItem[] = snap.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.();
      return {
        id: doc.id,
        userName:
          typeof data.userName === "string" ? data.userName.slice(0, 120) : null,
        message:
          typeof data.message === "string" ? data.message.slice(0, 64) : "",
        createdAtMs: createdAt ? createdAt.getTime() : null,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[public/feedbacks] Failed to load feedbacks:", error);
    return NextResponse.json({ items: [] });
  }
}

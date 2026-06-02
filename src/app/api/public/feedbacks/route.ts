import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCreatedAtMs(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return null;
}

export async function GET() {
  const snap = await getAdminFirestore()
    .collection("feedbacks")
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  const items = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userName: (data.userName as string | null | undefined) ?? null,
      message: String(data.message ?? ""),
      createdAtMs: toCreatedAtMs(data.createdAt),
    };
  });

  return NextResponse.json({ items });
}

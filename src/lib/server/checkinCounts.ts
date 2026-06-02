import { getAdminFirestore } from "@/lib/auth/admin";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Aggregates check-in counts per userId since `since` (same metric as the coach UI). */
export async function aggregateCheckinCountsSince(
  since: Date,
): Promise<Record<string, number>> {
  const snap = await getAdminFirestore()
    .collection("checkins")
    .where("createdAt", ">=", since)
    .select("userId")
    .get();

  const counts: Record<string, number> = {};
  for (const doc of snap.docs) {
    const userId = doc.data().userId;
    if (typeof userId !== "string" || userId.length === 0) continue;
    counts[userId] = (counts[userId] ?? 0) + 1;
  }
  return counts;
}

export function getDefaultCoachCountsSince(reference = new Date()): Date {
  return new Date(reference.getTime() - THIRTY_DAYS_MS);
}

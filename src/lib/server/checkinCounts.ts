import { unstable_cache } from "next/cache";
import { getAdminFirestore } from "@/lib/auth/admin";
import { readCheckinCountRollup } from "./checkinCountRollup";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const COUNTS_CACHE_SECONDS = 90;

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

/** Cached aggregation for coach dashboard polling (TTL < poll interval). */
export async function getCachedCheckinCountsForDays(
  days: number,
): Promise<Record<string, number>> {
  const bucket = Math.floor(Date.now() / (COUNTS_CACHE_SECONDS * 1000));
  return unstable_cache(
    async () => {
      if (days === 30) {
        const rollup = await readCheckinCountRollup();
        if (rollup) return rollup;
        return aggregateCheckinCountsSince(getDefaultCoachCountsSince());
      }
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return aggregateCheckinCountsSince(since);
    },
    ["checkin-counts", String(days), String(bucket)],
    { revalidate: COUNTS_CACHE_SECONDS },
  )();
}

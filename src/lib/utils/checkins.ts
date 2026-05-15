import { toDate } from "@/lib/utils/date";

/**
 * Aggregate check‑ins by class (turma).
 * Returns a map where the key is the class name (or id) and the value is the count of check‑ins.
 */
export function aggregateCheckinsByClass(
  checkins: import("@/lib/types").CheckIn[],
  days: number = 14,
): Map<string, number> {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() - days);

  const map = new Map<string, number>();
  for (const ci of checkins) {
    let d: Date | null = null;
    if (ci.createdAt instanceof Date) {
      d = ci.createdAt;
    } else if (typeof ci.createdAt === "number") {
      d = new Date(ci.createdAt);
    } else {
      d = toDate(ci.createdAt as unknown);
    }
    if (!d || d < cutoff) continue;

    const key = ci.className ?? "Sem turma";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

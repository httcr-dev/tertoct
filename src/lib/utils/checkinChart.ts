import { parseDateKey } from "@/lib/utils/checkinPeriod";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex"] as const;

export function countCheckinsByDateKeys(
  checkins: ReadonlyArray<{ classDateKey?: string | null }>,
  dateKeys: readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of dateKeys) {
    counts.set(key, 0);
  }
  for (const checkin of checkins) {
    const key = checkin.classDateKey;
    if (!key || !counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function buildCheckinChartItems(
  dateKeys: readonly string[],
  counts: ReadonlyMap<string, number>,
  options?: { weekView?: boolean },
): Array<{ key: string; count: number; label: string }> {
  const weekView = options?.weekView ?? false;

  return dateKeys.map((key, index) => {
    const count = counts.get(key) ?? 0;
    const label = weekView
      ? (WEEKDAY_LABELS[index] ??
          parseDateKey(key).toLocaleDateString("pt-BR", { weekday: "short" }))
      : parseDateKey(key).toLocaleDateString("pt-BR", { day: "2-digit" });

    return { key, count, label };
  });
}

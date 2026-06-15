import { formatDateKey, getWeekDateKeys, getWeekEnd, getWeekStart } from "@/lib/utils/weekFilters";

export type CheckinHistoryPeriodMode =
  | "current-week"
  | "current-month"
  | "pick-week"
  | "pick-month";

export type CheckinHistoryPeriod = {
  mode: CheckinHistoryPeriodMode;
  weekAnchor?: string;
  month?: string;
};

export type CheckinHistoryQuery = {
  classDateKeys?: string[];
  classDateKeyFrom?: string;
  classDateKeyTo?: string;
  since?: Date;
};

export function getCurrentMonthKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getMonthDateKeyRange(monthKey: string): {
  from: string;
  to: string;
} {
  const [year, month] = monthKey.split("-").map(Number);
  const from = formatDateKey(new Date(year, month - 1, 1));
  const lastDay = new Date(year, month, 0).getDate();
  const to = formatDateKey(new Date(year, month - 1, lastDay));
  return { from, to };
}

export function getMonthDateKeys(monthKey: string): string[] {
  const { from, to } = getMonthDateKeyRange(monthKey);
  const keys: string[] = [];
  const cursor = parseDateKey(from);
  const end = parseDateKey(to);
  while (cursor <= end) {
    keys.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function buildCheckinHistoryPeriod(
  mode: CheckinHistoryPeriodMode,
  options: { weekAnchor?: string; month?: string },
  now: Date = new Date(),
): CheckinHistoryPeriod {
  if (mode === "pick-week") {
    return {
      mode,
      weekAnchor: options.weekAnchor ?? formatDateKey(now),
    };
  }
  if (mode === "pick-month") {
    return {
      mode,
      month: options.month ?? getCurrentMonthKey(now),
    };
  }
  return { mode };
}

export function resolveCheckinHistoryQuery(
  period: CheckinHistoryPeriod,
  now: Date = new Date(),
): CheckinHistoryQuery {
  switch (period.mode) {
    case "current-week":
      return { classDateKeys: getWeekDateKeys(now) };
    case "pick-week": {
      const anchor = period.weekAnchor
        ? parseDateKey(period.weekAnchor)
        : now;
      return { classDateKeys: getWeekDateKeys(anchor) };
    }
    case "current-month": {
      const range = getMonthDateKeyRange(getCurrentMonthKey(now));
      return {
        classDateKeyFrom: range.from,
        classDateKeyTo: range.to,
      };
    }
    case "pick-month": {
      const monthKey = period.month ?? getCurrentMonthKey(now);
      const range = getMonthDateKeyRange(monthKey);
      return {
        classDateKeyFrom: range.from,
        classDateKeyTo: range.to,
      };
    }
  }
}

export function getCheckinHistoryPeriodLabel(
  period: CheckinHistoryPeriod,
  now: Date = new Date(),
): string {
  switch (period.mode) {
    case "current-week":
      return "Semana atual";
    case "current-month":
      return "Mês atual";
    case "pick-week": {
      const anchor = period.weekAnchor
        ? parseDateKey(period.weekAnchor)
        : now;
      const start = getWeekStart(anchor);
      const end = getWeekEnd(anchor);
      const fmt = (d: Date) =>
        d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return `Semana ${fmt(start)} – ${fmt(end)}`;
    }
    case "pick-month": {
      const monthKey = period.month ?? getCurrentMonthKey(now);
      const [year, month] = monthKey.split("-").map(Number);
      const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
  }
}

export function isMonthPeriod(mode: CheckinHistoryPeriodMode): boolean {
  return mode === "current-month" || mode === "pick-month";
}

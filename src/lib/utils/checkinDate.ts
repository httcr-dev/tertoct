import { startOfWeek } from "@/lib/utils/date";
import { getDateKeyForOffset } from "@/lib/utils/dateKey";

const GYM_UTC_OFFSET_MINUTES = -180;

/** Calendar date as YYYY-MM-DD from year/month/day parts. */
export function localDateToDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateKeyToLocalDate(dateKey: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function getTodayDateKey(reference = new Date()): string {
  return getDateKeyForOffset(reference, GYM_UTC_OFFSET_MINUTES);
}

/** Monday–Friday in local calendar (0 = Sunday). */
export function isWeekdayDateKey(dateKey: string): boolean {
  const day = dateKeyToLocalDate(dateKey).getDay();
  return day >= 1 && day <= 5;
}

export function isPastDateKey(
  dateKey: string,
  todayKey = getTodayDateKey(),
): boolean {
  return dateKey < todayKey;
}

export function isAllowedCheckinDateKey(
  dateKey: string,
  todayKey = getTodayDateKey(),
): boolean {
  return isWeekdayDateKey(dateKey) && !isPastDateKey(dateKey, todayKey);
}

/** First selectable weekday: today if Mon–Fri, otherwise next Monday. */
export function getDefaultCheckinDateKey(reference = new Date()): string {
  const todayKey = getTodayDateKey(reference);
  if (isAllowedCheckinDateKey(todayKey, todayKey)) {
    return todayKey;
  }
  const allowed = getAllowedCheckinDateKeys(reference);
  return allowed[0] ?? todayKey;
}

export function clampCheckinDateKey(
  dateKey: string,
  reference = new Date(),
): string {
  const todayKey = getTodayDateKey(reference);
  const allowed = getAllowedCheckinDateKeys(reference);
  if (allowed.length === 0) return getDefaultCheckinDateKey(reference);
  if (allowed.includes(dateKey)) return dateKey;
  if (isPastDateKey(dateKey, todayKey)) return allowed[0];
  return allowed[allowed.length - 1];
}

/**
 * Weekdays from today (or next Monday if weekend) through Friday of that work week.
 */
export function getAllowedCheckinDateKeys(reference = new Date()): string[] {
  const todayKey = getTodayDateKey(reference);
  const today = dateKeyToLocalDate(todayKey);
  const keys: string[] = [];

  const cursor = new Date(today);
  const day = cursor.getDay();
  if (day === 0) cursor.setDate(cursor.getDate() + 1);
  if (day === 6) cursor.setDate(cursor.getDate() + 2);

  const weekStart = startOfWeek(cursor);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  while (cursor <= weekEnd) {
    const weekday = cursor.getDay();
    if (weekday >= 1 && weekday <= 5) {
      const key = localDateToDateKey(cursor);
      if (!isPastDateKey(key, todayKey)) {
        keys.push(key);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function formatCheckinDateLabel(
  dateKey: string,
  todayKey = getTodayDateKey(),
): string {
  const date = dateKeyToLocalDate(dateKey);
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" });
  const dayMonth = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  if (dateKey === todayKey) return `Hoje (${dayMonth})`;
  return `${weekday} · ${dayMonth}`;
}

import type { CheckIn, GymClass } from "@/lib/types";
import { getDateKeyForOffset, utcDateAtLocalTime } from "@/lib/utils/dateKey";
import { parseHHmm } from "@/lib/utils/time";

const DEFAULT_UTC_OFFSET_MINUTES = -180;
const CANCEL_BEFORE_MS = 60 * 60 * 1000;

type ClassTiming = Pick<GymClass, "startTime" | "utcOffsetMinutes">;

export function getCheckInClassDateKey(
  checkIn: CheckIn,
  utcOffsetMinutes = DEFAULT_UTC_OFFSET_MINUTES,
): string | null {
  const raw = checkIn.classDateKey;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }
  return getDateKeyForOffset(checkIn.createdAt, utcOffsetMinutes);
}

export function getClassStartAt(
  checkIn: CheckIn,
  gymClass: ClassTiming | null,
): Date | null {
  const offset = gymClass?.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES;
  const dateKey = getCheckInClassDateKey(checkIn, offset);
  if (!dateKey) return null;

  const startTime = checkIn.classStartTime ?? gymClass?.startTime ?? null;
  if (!startTime) return null;

  const startMinutes = parseHHmm(startTime);
  if (startMinutes == null) return null;

  const startAt = utcDateAtLocalTime(dateKey, startMinutes, offset);
  if (Number.isNaN(startAt.getTime())) return null;
  return startAt;
}

export function getCheckInCancelDeadline(
  checkIn: CheckIn,
  gymClass: ClassTiming | null,
): Date | null {
  const startAt = getClassStartAt(checkIn, gymClass);
  if (!startAt) return null;
  return new Date(startAt.getTime() - CANCEL_BEFORE_MS);
}

export function canCancelCheckIn(
  checkIn: CheckIn,
  gymClass: ClassTiming | null,
  now = new Date(),
): boolean {
  const deadline = getCheckInCancelDeadline(checkIn, gymClass);
  if (!deadline) return false;
  return now.getTime() <= deadline.getTime();
}

export function formatClassDateKey(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

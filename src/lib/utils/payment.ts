import type { AppUserProfile, DateLikeTimestamp } from "@/lib/firebase";

function toPaymentDate(value: DateLikeTimestamp): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }
  return null;
}

/** Last moment of the due day in a calendar month (handles shorter months). */
export function endOfDueDayInMonth(
  year: number,
  month: number,
  dueDay: number,
): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(year, month, day, 23, 59, 59, 999);
}

/**
 * Unpaid student is past due when:
 * - today is after the due day in the current month, or
 * - today is before this month's due day but the previous month's due has passed
 *   (e.g. vence dia 28, hoje dia 1 → atrasado pela mensalidade de maio).
 * On the due day itself, check-in remains allowed until the next day.
 */
export function isUnpaidPastDue(dueDay: number, now = new Date()): boolean {
  const today = now.getDate();
  if (today > dueDay) return true;
  if (today === dueDay) return false;

  const month = now.getMonth();
  const year = now.getFullYear();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const endPrevDue = endOfDueDayInMonth(prevYear, prevMonth, dueDay);

  return now.getTime() > endPrevDue.getTime();
}

export function isPaymentOverdue(
  profile: AppUserProfile | null | undefined,
  now = new Date(),
): boolean {
  if (!profile) return false;
  const validUntil = profile.paymentValidUntil;

  if (validUntil) {
    try {
      const d = toPaymentDate(validUntil);
      if (!d) return false;
      return now.getTime() > d.getTime();
    } catch {
      // If parsing fails, fall through.
    }
  }

  if (profile.paymentDueDay != null) {
    if (profile.monthlyPaymentPaid === true) return false;
    return isUnpaidPastDue(profile.paymentDueDay, now);
  }

  return profile.monthlyPaymentPaid === false;
}

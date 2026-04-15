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

export function isPaymentOverdue(
  profile: AppUserProfile | null | undefined,
): boolean {
  if (!profile) return false;
  const dueDay = profile.paymentDueDay;
  if (dueDay == null) return false; // No due day set, no restriction

  // Check if there's a valid expiration date set by coach
  const validUntil = profile.paymentValidUntil;
  const now = new Date();

  if (validUntil) {
    try {
      const d = toPaymentDate(validUntil);
      if (!d) return false;
      return now.getTime() > d.getTime();
    } catch {
      // If parsing fails, fall back to the boolean-based rule below.
    }
  }

  // Fallback for older records or missing validUntil
  const isPaid = profile.monthlyPaymentPaid;
  if (isPaid) return false; // marked as paid indefinitely

  const currentDay = now.getDate();
  return currentDay > dueDay;
}

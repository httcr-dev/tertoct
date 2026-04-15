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
  const validUntil = profile.paymentValidUntil;
  const now = new Date();

  if (validUntil) {
    try {
      const d = toPaymentDate(validUntil);
      if (!d) return false;
      return now.getTime() > d.getTime();
    } catch {
      // If parsing fails, fall through to legacy flag.
    }
  }

  // Legacy fallback: while migrating old records without canonical expiration.
  return profile.monthlyPaymentPaid === false;
}

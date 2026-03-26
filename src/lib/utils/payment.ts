import type { AppUserProfile } from "@/lib/firebase";

export function isPaymentOverdue(profile: AppUserProfile | null | undefined): boolean {
  if (!profile) return false;
  const dueDay = profile.paymentDueDay;
  if (dueDay == null) return false; // No due day set, no restriction
  
  // Check if there's a valid expiration date set by coach
  const validUntil = profile.paymentValidUntil;
  const now = new Date();

  if (validUntil) {
    try {
      const d = (typeof validUntil.toDate === "function") 
        ? validUntil.toDate() 
        : new Date(validUntil);
      return now.getTime() > d.getTime();
    } catch (err) {
      console.error("Error parsing validUntil:", err);
    }
  }

  // Fallback for older records or missing validUntil
  const isPaid = profile.monthlyPaymentPaid;
  if (isPaid) return false; // marked as paid indefinitely
  
  const currentDay = now.getDate();
  return currentDay > dueDay;
}

import type { StudentSummary } from "@/lib/types";

export interface FilterParams {
  selectedPlanId: string;
  paymentFilter: string;
}

export function filterStudents(
  students: StudentSummary[],
  { selectedPlanId, paymentFilter }: FilterParams,
): StudentSummary[] {
  let list = students;

  // ── Plan filter ────────────────────────────────────────────────────
  if (selectedPlanId === "none") {
    list = list.filter((s) => s.planId == null);
  } else if (selectedPlanId !== "all") {
    list = list.filter((s) => s.planId === selectedPlanId);
  }

  // ── Payment filter ─────────────────────────────────────────────────
  if (paymentFilter !== "all") {
    const now = new Date();
    list = list.filter((s) => {
      const hasDueDay = s.paymentDueDay != null;
      if (paymentFilter === "none") return !hasDueDay;
      if (!hasDueDay) return false;

      let isPaid = false;
      if (s.paymentValidUntil) {
        isPaid = now.getTime() <= s.paymentValidUntil.toDate().getTime();
      } else {
        isPaid = !!s.monthlyPaymentPaid || now.getDate() <= s.paymentDueDay!;
      }

      if (paymentFilter === "pending") return !isPaid;

      if (isPaid) {
        if (!s.paymentValidUntil) return paymentFilter === "active";
        const validUntil = s.paymentValidUntil.toDate();
        const isNextMonth =
          validUntil.getMonth() !== now.getMonth() ||
          validUntil.getFullYear() !== now.getFullYear();
        if (paymentFilter === "paid") return isNextMonth;
        if (paymentFilter === "active") return !isNextMonth;
      }
      return false;
    });
  }

  return list;
}

import type { StudentSummary } from "@/lib/types";
import { toDate } from "@/lib/utils/date";
import { isPaymentOverdue } from "@/lib/utils/payment";

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

      const overdue = isPaymentOverdue(
        {
          id: s.id,
          name: s.name,
          email: s.email,
          role: "student",
          active: s.active ?? true,
          planId: s.planId,
          paymentDueDay: s.paymentDueDay,
          monthlyPaymentPaid: s.monthlyPaymentPaid,
          paymentValidUntil: s.paymentValidUntil,
        },
        now,
      );
      const isPaid = !overdue;

      if (paymentFilter === "pending") return overdue;

      if (isPaid) {
        if (!s.paymentValidUntil) return paymentFilter === "active";
        const validUntil = toDate(s.paymentValidUntil);
        if (!validUntil) return paymentFilter === "active";
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

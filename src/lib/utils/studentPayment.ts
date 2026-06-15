import type { StudentSummary } from "@/lib/types";
import { toDate } from "@/lib/utils/date";
import { isUnpaidPastDue } from "@/lib/utils/payment";

export interface StudentPaymentInfo {
  situation: string;
  situationClass: string;
  actionLabel: string;
  actionTitle: string;
  actionClass: string;
}

function formatPaymentDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function getNextValidUntilDate(dueDay: number, now = new Date()): Date {
  let targetMonth = now.getMonth() + 1;
  let targetYear = now.getFullYear();
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(targetYear, targetMonth, day, 23, 59, 59, 999);
}

export function isMarkedPaid(
  student: StudentSummary,
  now = new Date(),
): boolean {
  if (student.paymentValidUntil) {
    const validUntil = toDate(student.paymentValidUntil);
    if (validUntil) {
      return now.getTime() <= validUntil.getTime();
    }
  }
  return student.monthlyPaymentPaid === true;
}

export function getStudentPaymentInfo(
  student: StudentSummary,
  now = new Date(),
): StudentPaymentInfo {
  if (student.paymentDueDay == null) {
    return {
      situation: "Sem vencimento",
      situationClass: "text-zinc-400",
      actionLabel: "—",
      actionTitle: "Defina o dia de vencimento",
      actionClass: "",
    };
  }

  const markedPaid = isMarkedPaid(student, now);
  const nextUntil = formatPaymentDate(
    getNextValidUntilDate(student.paymentDueDay, now),
  );
  const overdue = isUnpaidPastDue(student.paymentDueDay, now);
  const dueLabel = `dia ${student.paymentDueDay}`;

  if (markedPaid) {
    const validUntil = toDate(student.paymentValidUntil ?? null);
    const paidUntil = validUntil ? formatPaymentDate(validUntil) : null;
    return {
      situation: paidUntil ? `Pago até ${paidUntil}` : "Pago",
      situationClass: "text-emerald-400",
      actionLabel: "Desfazer pagamento",
      actionTitle: overdue
        ? "Remove confirmação · volta a atrasado"
        : "Remove confirmação · volta a no prazo",
      actionClass:
        "border-zinc-600/50 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-800",
    };
  }

  if (overdue) {
    return {
      situation: `Atrasado · ${dueLabel}`,
      situationClass: "text-red-400",
      actionLabel: "Confirmar pagamento",
      actionTitle: `Registra pagamento até ${nextUntil} e libera check-in`,
      actionClass:
        "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    };
  }

  return {
    situation: `No prazo · ${dueLabel}`,
    situationClass: "text-amber-400",
    actionLabel: "Confirmar pagamento",
    actionTitle: `Registra pagamento válido até ${nextUntil}`,
    actionClass:
      "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
  };
}

export function getEffectiveDueDate(
  student: StudentSummary,
  now = new Date(),
): Date | null {
  if (student.paymentValidUntil) {
    const d = toDate(student.paymentValidUntil);
    if (d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  if (!student.paymentDueDay) return null;

  let targetMonth = now.getMonth();
  let targetYear = now.getFullYear();

  if (student.monthlyPaymentPaid) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(student.paymentDueDay, lastDayOfMonth);
  return new Date(targetYear, targetMonth, day);
}

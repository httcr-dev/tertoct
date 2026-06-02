"use client";

import Image from "next/image";
import { History, Users } from "lucide-react";
import { StudentSummary, Plan } from "@/lib/types";
import { isUnpaidPastDue } from "@/lib/utils/payment";

interface StudentsTabProps {
  filteredStudents: StudentSummary[];
  selectedPlanId: string;
  setSelectedPlanId: (planId: string) => void;
  paymentFilter: string;
  setPaymentFilter: (filter: string) => void;
  plans: Plan[];
  viewCheckins: (student: StudentSummary) => Promise<void>;
  handleAssignPlan: (studentId: string, planId: string | null) => Promise<void>;
  handleSetPaymentDay: (studentId: string, day: number | null) => Promise<void>;
  handleTogglePayment: (student: StudentSummary) => Promise<void>;
}

interface StudentPaymentInfo {
  situation: string;
  situationClass: string;
  actionLabel: string;
  actionTitle: string;
  actionClass: string;
}

function formatPaymentDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function getNextValidUntilDate(dueDay: number): Date {
  const now = new Date();
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

function isMarkedPaid(student: StudentSummary): boolean {
  if (student.paymentValidUntil) {
    return new Date().getTime() <= student.paymentValidUntil.toDate().getTime();
  }
  return student.monthlyPaymentPaid === true;
}

function getStudentPaymentInfo(student: StudentSummary): StudentPaymentInfo {
  if (student.paymentDueDay == null) {
    return {
      situation: "Sem vencimento",
      situationClass: "text-zinc-400",
      actionLabel: "—",
      actionTitle: "Defina o dia de vencimento",
      actionClass: "",
    };
  }

  const now = new Date();
  const markedPaid = isMarkedPaid(student);
  const nextUntil = formatPaymentDate(getNextValidUntilDate(student.paymentDueDay));
  const overdue = isUnpaidPastDue(student.paymentDueDay, now);
  const dueLabel = `dia ${student.paymentDueDay}`;

  if (markedPaid) {
    const validUntil = student.paymentValidUntil?.toDate();
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

const thClass =
  "px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap";
const tdClass = "px-3 py-2.5 align-middle text-xs text-zinc-300";
const selectClass =
  "dashboard-input w-full min-w-0 cursor-pointer px-2 py-1.5 text-xs";
const fieldLabelClass =
  "text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

function StudentAvatar({ student }: { student: StudentSummary }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800 text-[11px] font-bold text-zinc-300 md:h-8 md:w-8 md:rounded-md">
      {student.photoURL ? (
        <Image
          src={student.photoURL}
          alt=""
          width={36}
          height={36}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          unoptimized
        />
      ) : (
        (student.name?.charAt(0) ?? "U").toUpperCase()
      )}
    </div>
  );
}

function StudentRowControls({
  student,
  plans,
  paymentInfo,
  handleAssignPlan,
  handleSetPaymentDay,
  handleTogglePayment,
  layout,
}: {
  student: StudentSummary;
  plans: Plan[];
  paymentInfo: StudentPaymentInfo;
  handleAssignPlan: (studentId: string, planId: string | null) => Promise<void>;
  handleSetPaymentDay: (studentId: string, day: number | null) => Promise<void>;
  handleTogglePayment: (student: StudentSummary) => Promise<void>;
  layout: "table" | "card";
}) {
  if (layout === "table") {
    return (
      <>
        <td className={tdClass}>
          <select
            aria-label={`Plano de ${student.name ?? "aluno"}`}
            className={selectClass}
            value={student.planId ?? ""}
            onChange={(e) =>
              handleAssignPlan(student.id, e.target.value || null)
            }
          >
            <option value="">Nenhum</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </td>
        <td className={tdClass}>
          <select
            aria-label={`Vencimento de ${student.name ?? "aluno"}`}
            className={selectClass}
            value={student.paymentDueDay ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              handleSetPaymentDay(student.id, val ? Number(val) : null);
            }}
          >
            <option value="">—</option>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </td>
        <td className={tdClass}>
          <span
            className={`block truncate font-medium ${paymentInfo.situationClass}`}
            title={paymentInfo.situation}
          >
            {paymentInfo.situation}
          </span>
        </td>
        <td className={tdClass}>
          {student.paymentDueDay != null ? (
            <button
              type="button"
              title={paymentInfo.actionTitle}
              onClick={() => handleTogglePayment(student)}
              className={`w-full cursor-pointer truncate rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-all active:scale-[0.98] ${paymentInfo.actionClass}`}
            >
              {paymentInfo.actionLabel}
            </button>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </td>
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-zinc-800/50 px-3 py-3">
      <div className="min-w-0 space-y-1">
        <span className={fieldLabelClass}>Plano</span>
        <select
          aria-label={`Plano de ${student.name ?? "aluno"}`}
          className={`${selectClass} py-2`}
          value={student.planId ?? ""}
          onChange={(e) => handleAssignPlan(student.id, e.target.value || null)}
        >
          <option value="">Nenhum</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0 space-y-1">
        <span className={fieldLabelClass}>Vencimento</span>
        <select
          aria-label={`Vencimento de ${student.name ?? "aluno"}`}
          className={`${selectClass} py-2`}
          value={student.paymentDueDay ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            handleSetPaymentDay(student.id, val ? Number(val) : null);
          }}
        >
          <option value="">Dia —</option>
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 min-w-0 space-y-1">
        <span className={fieldLabelClass}>Situação</span>
        <p className={`text-sm font-medium leading-snug ${paymentInfo.situationClass}`}>
          {paymentInfo.situation}
        </p>
      </div>
      {student.paymentDueDay != null && (
        <div className="col-span-2">
          <button
            type="button"
            title={paymentInfo.actionTitle}
            onClick={() => handleTogglePayment(student)}
            className={`w-full cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] ${paymentInfo.actionClass}`}
          >
            {paymentInfo.actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/50 text-zinc-500">
        <Users className="h-5 w-5" />
      </div>
      <p className="text-sm text-zinc-400">
        Nenhum aluno encontrado para estes filtros.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-3 text-xs font-semibold text-amber-500 hover:text-amber-400"
      >
        Limpar filtros
      </button>
    </div>
  );
}

export function StudentsTab({
  filteredStudents,
  selectedPlanId,
  setSelectedPlanId,
  paymentFilter,
  setPaymentFilter,
  plans,
  viewCheckins,
  handleAssignPlan,
  handleSetPaymentDay,
  handleTogglePayment,
}: StudentsTabProps) {
  const clearFilters = () => {
    setSelectedPlanId("all");
    setPaymentFilter("all");
  };

  const controlProps = {
    plans,
    handleAssignPlan,
    handleSetPaymentDay,
    handleTogglePayment,
  };

  return (
    <section className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-zinc-50 sm:text-xl">
          Gestão de Alunos
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Planos, vencimentos e pagamentos. No celular, use os cards abaixo.
        </p>
      </div>

      <div className="dashboard-card grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:flex lg:flex-wrap lg:items-end lg:gap-4">
        <div className="min-w-0 space-y-1.5 lg:min-w-[160px]">
          <span className={fieldLabelClass}>Filtrar plano</span>
          <select
            className="dashboard-input w-full cursor-pointer px-3 py-2.5 text-sm"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="none">Sem plano</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 space-y-1.5 lg:min-w-[160px]">
          <span className={fieldLabelClass}>Filtrar pagamento</span>
          <select
            className="dashboard-input w-full cursor-pointer px-3 py-2.5 text-sm"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos (próx. mês)</option>
            <option value="active">Vence este mês</option>
            <option value="pending">Pendentes</option>
            <option value="none">Sem data</option>
          </select>
        </div>
        <p className="text-xs text-zinc-500 sm:col-span-2 lg:ml-auto lg:self-end">
          {filteredStudents.length}{" "}
          {filteredStudents.length === 1 ? "aluno" : "alunos"}
        </p>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {filteredStudents.length === 0 ? (
          <div className="dashboard-card">
            <EmptyState onClearFilters={clearFilters} />
          </div>
        ) : (
          filteredStudents.map((student) => {
            const paymentInfo = getStudentPaymentInfo(student);
            return (
              <article key={student.id} className="dashboard-card overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <StudentAvatar student={student} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-100">
                      {student.name ?? "Sem nome"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {student.weeklyCheckIns} check-ins (30 dias)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => viewCheckins(student)}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                  >
                    <History className="h-3.5 w-3.5" />
                    Histórico
                  </button>
                </div>
                <StudentRowControls
                  student={student}
                  paymentInfo={paymentInfo}
                  layout="card"
                  {...controlProps}
                />
              </article>
            );
          })
        )}
      </div>

      {/* Desktop: table */}
      <div className="dashboard-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[9%]" />
              <col className="w-[18%]" />
              <col className="w-[9%]" />
              <col className="w-[24%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-950/40">
                <th className={thClass}>Aluno</th>
                <th className={thClass}>Check-ins</th>
                <th className={thClass}>Plano</th>
                <th className={thClass}>Venc.</th>
                <th className={thClass}>Situação</th>
                <th className={thClass}>Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredStudents.map((student) => {
                const paymentInfo = getStudentPaymentInfo(student);
                return (
                  <tr
                    key={student.id}
                    className="h-14 transition-colors hover:bg-zinc-800/20"
                  >
                    <td className={tdClass}>
                      <button
                        type="button"
                        onClick={() => viewCheckins(student)}
                        title="Ver histórico de check-ins"
                        className="flex w-full min-w-0 cursor-pointer items-center gap-2 text-left"
                      >
                        <StudentAvatar student={student} />
                        <span className="min-w-0 truncate font-medium text-zinc-100">
                          {student.name ?? "Sem nome"}
                        </span>
                        <History className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
                      </button>
                    </td>
                    <td className={`${tdClass} tabular-nums text-zinc-400`}>
                      {student.weeklyCheckIns}
                      <span className="ml-0.5 text-[10px] text-zinc-600">/30d</span>
                    </td>
                    <StudentRowControls
                      student={student}
                      paymentInfo={paymentInfo}
                      layout="table"
                      {...controlProps}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="border-t border-zinc-800/50">
            <EmptyState onClearFilters={clearFilters} />
          </div>
        )}
      </div>
    </section>
  );
}

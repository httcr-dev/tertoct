"use client";

import { StudentSummary, Plan } from "@/lib/types";

interface StudentsTabProps {
  filteredStudents: StudentSummary[];
  selectedPlanId: string;
  setSelectedPlanId: (planId: string) => void;
  plans: Plan[];
  viewCheckins: (student: StudentSummary) => Promise<void>;
  handleAssignPlan: (studentId: string, planId: string | null) => Promise<void>;
  handleSetPaymentDay: (studentId: string, day: number | null) => Promise<void>;
  handleTogglePayment: (student: StudentSummary) => Promise<void>;
}

export function StudentsTab({
  filteredStudents,
  selectedPlanId,
  setSelectedPlanId,
  plans,
  viewCheckins,
  handleAssignPlan,
  handleSetPaymentDay,
  handleTogglePayment,
}: StudentsTabProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">Alunos e Planos</h2>
          <p className="text-sm text-zinc-400">
            Atribua planos e acompanhe quem está treinando.
          </p>
        </div>
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
        >
          <option value="all">Filtro: Todos os planos</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        {filteredStudents.map((student) => {
          const currentPlan = student.planId
            ? plans.find((p) => p.id === student.planId)
            : null;
          return (
            <div
              key={student.id}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 transition-colors hover:border-zinc-700"
            >
              {/* Main row: avatar + info + plan select */}
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-4"
                  onClick={() => viewCheckins(student)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700/50 bg-zinc-800 font-medium text-zinc-300">
                    {student.photoURL ? (
                      <img
                        src={student.photoURL}
                        alt={student.name || ""}
                        className="block h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : student.name ? (
                      student.name.charAt(0).toUpperCase()
                    ) : (
                      "U"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {student.name ?? "Aluno sem nome"}
                    </p>
                    <p className="truncate text-xs mt-0.5 text-zinc-400">
                      {student.email ?? "sem e-mail"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p
                      className={`text-xs font-medium ${currentPlan ? "text-emerald-400" : "text-zinc-500"}`}
                    >
                      {currentPlan ? currentPlan.name : "Sem plano"}
                    </p>
                    <p className="text-[11px] mt-0.5 text-amber-500">
                      {student.weeklyCheckIns} check-in
                      {student.weeklyCheckIns === 1 ? "" : "s"} hoje/semana
                    </p>
                  </div>
                  <select
                    className="rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-xs text-zinc-300 focus:border-amber-500/50 focus:outline-none"
                    value={student.planId ?? ""}
                    onChange={(e) =>
                      handleAssignPlan(student.id, e.target.value || null)
                    }
                  >
                    <option value="">Sem plano</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Payment row */}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-zinc-800/40 pt-3">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Vencimento:
                  </span>
                  <select
                    className="rounded-lg border border-zinc-700 bg-black/50 px-2 py-1 text-xs text-zinc-300 focus:border-amber-500/50 focus:outline-none"
                    value={student.paymentDueDay ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleSetPaymentDay(student.id, val ? Number(val) : null);
                    }}
                  >
                    <option value="">Nenhum</option>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Dia {d}
                      </option>
                    ))}
                  </select>
                </div>
                {student.paymentDueDay != null ? (
                  <button
                    onClick={() => handleTogglePayment(student)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                      student.monthlyPaymentPaid
                        ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                        : "animate-pulse border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                    }`}
                  >
                    {student.monthlyPaymentPaid ? (
                      <>
                        <span>✓</span> Pago
                      </>
                    ) : (
                      <>
                        <span>✕</span> Pendente
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] italic text-zinc-600">
                    Sem controle de pagamento
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {filteredStudents.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-800/50 py-12 text-center">
            <p className="text-sm text-zinc-500">Nenhum aluno encontrado.</p>
          </div>
        )}
      </div>
    </section>
  );
}

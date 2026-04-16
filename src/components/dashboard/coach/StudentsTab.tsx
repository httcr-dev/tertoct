"use client";

import Image from "next/image";
import { StudentSummary, Plan } from "@/lib/types";
import { Users } from "lucide-react";

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
  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-bold text-zinc-50 tracking-tight">Gestão de Alunos</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Controle de planos, vencimentos e status de pagamento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Filtrar Plano</span>
            <select
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 transition-all focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none min-w-[180px]"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="all">Todos os Planos</option>
              <option value="none">Sem Plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Status Pagamento</span>
            <select
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 transition-all focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none min-w-[150px]"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="paid">Pagos (Mês Seguinte)</option>
              <option value="active">Ativos (Vence este mês)</option>
              <option value="pending">Pendentes / Atrasados</option>
              <option value="none">Sem Data Definida</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredStudents.map((student) => {
          const currentPlan = student.planId
            ? plans.find((p) => p.id === student.planId)
            : null;

          const now = new Date();
          let isPaid = false;
          let paymentStatusLabel = "";
          let statusColorClass = "";

          if (student.paymentDueDay != null) {
            if (student.paymentValidUntil) {
              const validUntil = student.paymentValidUntil.toDate();
              isPaid = now.getTime() <= validUntil.getTime();
              
              if (isPaid) {
                const isNextMonth = validUntil.getMonth() !== now.getMonth() || validUntil.getFullYear() !== now.getFullYear();
                paymentStatusLabel = isNextMonth 
                  ? `Pago até ${validUntil.getDate().toString().padStart(2, '0')}/${(validUntil.getMonth() + 1).toString().padStart(2, '0')}`
                  : `Ativo até ${validUntil.getDate().toString().padStart(2, '0')}/${(validUntil.getMonth() + 1).toString().padStart(2, '0')}`;
                statusColorClass = isNextMonth ? "text-emerald-400" : "text-amber-400";
              } else {
                paymentStatusLabel = `Vencido em ${validUntil.getDate().toString().padStart(2, '0')}/${(validUntil.getMonth() + 1).toString().padStart(2, '0')}`;
                statusColorClass = "text-red-400";
              }
            } else {
              if (student.monthlyPaymentPaid) {
                isPaid = true;
                paymentStatusLabel = "Pago";
                statusColorClass = "text-emerald-400";
              } else {
                isPaid = now.getDate() <= student.paymentDueDay;
                paymentStatusLabel = isPaid ? "No Prazo" : "Pendente";
                statusColorClass = isPaid ? "text-amber-400" : "text-red-400";
              }
            }
          } else {
            paymentStatusLabel = "Sem Vencimento";
            statusColorClass = "text-zinc-500";
          }

          return (
            <div
              key={student.id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 transition-all hover:border-zinc-700/80 hover:bg-zinc-900/60"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between p-5 gap-6">
                
                {/* Info Section */}
                <div 
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => viewCheckins(student)}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800 font-bold text-zinc-300 shadow-inner">
                      {student.photoURL ? (
                        <Image
                          src={student.photoURL}
                          alt={student.name || ""}
                          width={48}
                          height={48}
                          className="block h-full w-full object-cover transition-transform group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          unoptimized
                        />
                      ) : student.name ? (
                        student.name.charAt(0).toUpperCase()
                      ) : (
                        "U"
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-zinc-900 ${isPaid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                      {student.name ?? "Aluno sem nome"}
                    </h3>
                    <p className="truncate text-xs text-zinc-500 font-medium">
                      {student.email ?? "sem e-mail"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${currentPlan ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                        {currentPlan ? currentPlan.name : "Sem plano"}
                      </span>
                      <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/30">
                        {student.weeklyCheckIns} check-ins (30d)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls Section */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-800/50">
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.15em] ml-0.5">Atribuir Plano</label>
                    <select
                      className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-zinc-300 focus:border-amber-500/50 focus:outline-none transition-all hover:bg-black/60 cursor-pointer min-w-[130px]"
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
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.15em] ml-0.5">Vencimento</label>
                    <select
                      className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-zinc-300 focus:border-amber-500/50 focus:outline-none transition-all hover:bg-black/60 cursor-pointer"
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

                  <div className="flex flex-col gap-1.5 items-center lg:items-end">
                    <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.15em] mr-0.5">Status Pgto</label>
                    {student.paymentDueDay != null ? (
                      <div className="flex flex-col items-center lg:items-end gap-1">
                        <button
                          onClick={() => handleTogglePayment(student)}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-100 border border-red-500/30 animate-pulse hover:bg-red-500/20"
                          }`}
                        >
                          {isPaid ? "✓ Pago" : "✕ Pendente"}
                        </button>
                        <span className={`text-[10px] font-bold tracking-tight ${statusColorClass}`}>
                          {paymentStatusLabel}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] italic text-zinc-600 h-[38px] flex items-center">
                        Sem Controle
                      </span>
                    )}
                  </div>

                </div>
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-800/50 py-16 text-center bg-zinc-900/20 backdrop-blur-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/50 text-zinc-500 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-zinc-400 font-medium">Nenhum aluno encontrado para estes filtros.</p>
            <button 
              onClick={() => { setSelectedPlanId('all'); setPaymentFilter('all'); }}
              className="mt-4 text-xs font-bold text-amber-500 hover:text-amber-400 underline underline-offset-4"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
